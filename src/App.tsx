/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActiveTab, Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { DocumentationView } from './components/DocumentationView';
import { ImportExportView } from './components/ImportExportView';
import { ReplicationsView } from './components/ReplicationsView';
import { ScenarioComparison } from './components/ScenarioComparison';
import { SensitivityView } from './components/SensitivityView';
import { SpatialViewer } from './components/SpatialViewer';
import { ValidationView } from './components/ValidationView';
import { UrbanDigitalTwinView } from './components/DigitalTwin/UrbanDigitalTwinView';
import { SketchfabHub } from './components/Sketchfab/SketchfabHub';
import { LicensesView } from './components/LicensesView';
import { SiteModelingView } from './components/SiteModeling/SiteModelingView';
import { PdfReportsView } from './components/Reports/PdfReportsView';
import { DetailedSimulationReportModal } from './components/Reports/DetailedSimulationReportModal';
import { INITIAL_SPATIAL_LAYOUT } from './engine/spatial';
import { SCENARIO_PRESETS } from './engine/scenarios';
import { SimulationInstance } from './engine/simulationEngine';
import { parseObjTo2DLayout } from './services/objToSpatialLayout';
import {
  HourlyClimateData,
  ScenarioConfig,
  ScenarioId,
  ScenarioReplicationStats,
  SimulationResult,
  StepMetric,
} from './types/simulation';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('digitalTwin');
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>('S0');

  // Simulation state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(5); // 1x, 5x, 20x
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [metricsHistory, setMetricsHistory] = useState<StepMetric[]>([]);
  const [latestMetric, setLatestMetric] = useState<StepMetric | null>(null);
  const [finalResult, setFinalResult] = useState<SimulationResult | null>(null);
  const [isDetailedReportOpen, setIsDetailedReportOpen] = useState<boolean>(false);

  // Spatial layout state (can be edited in SiteModelingView)
  const [spatialLayout, setSpatialLayout] = useState(() => INITIAL_SPATIAL_LAYOUT);
  const [currentConfig, setCurrentConfig] = useState<ScenarioConfig>(() =>
    JSON.parse(JSON.stringify(SCENARIO_PRESETS.S0))
  );

  // Engine instance ref
  const engineRef = useRef<SimulationInstance | null>(null);
  const timerRef = useRef<number | null>(null);

  // Live agents for spatial visualization
  const [agents, setAgents] = useState(() => {
    const inst = new SimulationInstance(SCENARIO_PRESETS.S0, 1);
    engineRef.current = inst;
    return [...inst.agents];
  });

  // Replications stats tracker
  const [replicationsCompletedCount, setReplicationsCompletedCount] = useState<number>(0);
  const [allScenarioStats, setAllScenarioStats] = useState<ScenarioReplicationStats[]>([]);

  // Initialize or re-initialize simulation instance when scenario changes
  const initSimulation = (scenarioId: ScenarioId, customConfig?: ScenarioConfig) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSimulating(false);

    const cfg = customConfig || JSON.parse(JSON.stringify(SCENARIO_PRESETS[scenarioId]));
    setCurrentConfig(cfg);
    setActiveScenarioId(scenarioId);

    const newInstance = new SimulationInstance(cfg, 1);
    engineRef.current = newInstance;

    setCurrentStep(0);
    setMetricsHistory([]);
    setLatestMetric(null);
    setFinalResult(null);
    setAgents([...newInstance.agents]);
  };

  const handleScenarioChange = (newId: ScenarioId) => {
    setActiveScenarioId(newId);
    initSimulation(newId);
  };

  // Run single step
  const executeStep = () => {
    if (!engineRef.current) return;
    const metric = engineRef.current.step();
    if (metric) {
      setCurrentStep(metric.step);
      setLatestMetric(metric);
      setMetricsHistory((prev) => [...prev, metric]);
      setAgents([...engineRef.current.agents]);
    } else {
      // Finished 540 steps
      setIsSimulating(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const finalRes = engineRef.current.getFinalResult();
      setFinalResult(finalRes);
      // Automatically open detailed report on simulation completion
      setIsDetailedReportOpen(true);
    }
  };

  // Animation loop controlled by speed
  useEffect(() => {
    if (isSimulating) {
      const intervalMs = simulationSpeed === 20 ? 15 : simulationSpeed === 5 ? 60 : 250;
      timerRef.current = window.setInterval(() => {
        executeStep();
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSimulating, simulationSpeed]);

  const handleStart = () => {
    if (currentStep >= 540) return;
    setIsSimulating(true);
  };

  const handlePause = () => {
    setIsSimulating(false);
  };

  const handleReset = () => {
    initSimulation(activeScenarioId);
  };

  const handleRunToCompletion = () => {
    if (!engineRef.current) return;
    setIsSimulating(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const result = engineRef.current.runToCompletion();
    setCurrentStep(result.totalSteps);
    setMetricsHistory(result.metrics);
    setLatestMetric(result.metrics[result.metrics.length - 1]);
    setAgents([...engineRef.current.agents]);
    setFinalResult(result);
    // Automatically open detailed report after full-day simulation
    setIsDetailedReportOpen(true);
  };

  const handleNewSimulation = () => {
    // Generate a fresh seed
    const newSeed = Math.floor(Math.random() * 900000) + 10000;
    const updatedCfg: ScenarioConfig = {
      ...JSON.parse(JSON.stringify(SCENARIO_PRESETS[activeScenarioId])),
      seed: newSeed,
    };
    initSimulation(activeScenarioId, updatedCfg);
  };

  // Population & Initial Infection configuration handler
  const handleUpdatePopulationParams = (totalPop: number, initialInfected: number) => {
    const updatedCfg: ScenarioConfig = {
      ...currentConfig,
      initialPopulation: totalPop,
      initialInfectedCount: initialInfected,
    };
    initSimulation(activeScenarioId, updatedCfg);
  };

  // Microclimate update handler from CSV import
  const handleUpdateClimateData = (newData: HourlyClimateData[]) => {
    const updatedCfg: ScenarioConfig = {
      ...currentConfig,
      climate: {
        ...currentConfig.climate,
        observations: newData,
      },
    };
    initSimulation(activeScenarioId, updatedCfg);
  };

  const handleNotifyReplicationsDone = (count: number, stats: ScenarioReplicationStats[]) => {
    setReplicationsCompletedCount((prev) => prev + count);
    setAllScenarioStats(stats);
  };

  const clockTime = currentStep >= 540 ? '18:00' : latestMetric?.clockTime || '09:00';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Header and Nav */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeScenarioId={activeScenarioId}
        onScenarioChange={handleScenarioChange}
        isSimulating={isSimulating}
        clockTime={clockTime}
        step={currentStep}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'digitalTwin' && (
          <UrbanDigitalTwinView
            layout={spatialLayout}
            agents={agents}
            config={currentConfig}
            stepMetric={latestMetric}
            currentStep={currentStep}
            isSimulating={isSimulating}
            simulationSpeed={simulationSpeed}
            onSpeedChange={setSimulationSpeed}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onRunToCompletion={handleRunToCompletion}
            onScenarioChange={handleScenarioChange}
            onUpdateSpatialLayout={setSpatialLayout}
            onNavigateTab={setActiveTab}
            onOpenDetailedReport={() => setIsDetailedReportOpen(true)}
            onUpdatePopulationParams={handleUpdatePopulationParams}
            metricsHistory={metricsHistory}
          />
        )}

        {activeTab === 'siteModeling' && (
          <SiteModelingView
            layout={spatialLayout}
            onUpdateSpatialLayout={setSpatialLayout}
            activeScenarioId={activeScenarioId}
            onScenarioChange={handleScenarioChange}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'pdfReports' && (
          <PdfReportsView
            config={currentConfig}
            metrics={metricsHistory}
            result={finalResult}
            replicationsStats={allScenarioStats}
          />
        )}

        {activeTab === 'sketchfab' && (
          <SketchfabHub
            layout={spatialLayout}
            onUpdateSpatialLayout={setSpatialLayout}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'licenses' && <LicensesView />}

        {activeTab === 'dashboard' && (
          <Dashboard
            config={currentConfig}
            currentStep={currentStep}
            isSimulating={isSimulating}
            simulationSpeed={simulationSpeed}
            onSpeedChange={setSimulationSpeed}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onRunToCompletion={handleRunToCompletion}
            onNewSimulation={handleNewSimulation}
            onNavigateTab={setActiveTab}
            latestMetric={latestMetric}
            metricsHistory={metricsHistory}
            replicationsCompletedCount={replicationsCompletedCount}
            finalResult={finalResult}
            onUpdatePopulationParams={handleUpdatePopulationParams}
          />
        )}

        {activeTab === 'spatial' && (
          <SpatialViewer
            layout={INITIAL_SPATIAL_LAYOUT}
            agents={agents}
            config={currentConfig}
            stepMetric={latestMetric}
            currentStep={currentStep}
          />
        )}

        {activeTab === 'comparison' && (
          <ScenarioComparison
            onSelectScenario={handleScenarioChange}
            activeScenarioId={activeScenarioId}
            replicationsStats={allScenarioStats}
          />
        )}

        {activeTab === 'replications' && (
          <ReplicationsView
            onNotifyReplicationsDone={handleNotifyReplicationsDone}
            sharedScenarioStats={allScenarioStats}
          />
        )}

        {activeTab === 'sensitivity' && <SensitivityView />}

        {activeTab === 'validation' && <ValidationView />}

        {activeTab === 'importExport' && (
          <ImportExportView
            currentConfig={currentConfig}
            onUpdateClimateData={handleUpdateClimateData}
            activeResult={finalResult}
            allScenarioStats={allScenarioStats}
          />
        )}

        {activeTab === 'documentation' && (
          <DocumentationView currentConfig={currentConfig} />
        )}
      </main>

      {/* Scientific Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-500 text-xs py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">UrbanResilience SimLab</span>
            <span>·</span>
            <span>Unité de Voisinage 9, Ville Nouvelle Ali Mendjeli, Constantine</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-amber-400/90 font-medium">
              Hypothèse illustrative non calibrée cliniquement — Comparaisons relatives
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-400">PRNG Mulberry32 déterministe</span>
          </div>
        </div>
      </footer>
      {/* Comprehensive Scientific Urban Resilience Detailed Report Modal */}
      <DetailedSimulationReportModal
        isOpen={isDetailedReportOpen}
        onClose={() => setIsDetailedReportOpen(false)}
        config={currentConfig}
        metrics={metricsHistory}
        result={finalResult}
        layout={spatialLayout}
        onNavigateTab={(tab) => {
          setIsDetailedReportOpen(false);
          setActiveTab(tab as any);
        }}
      />
    </div>
  );
}
