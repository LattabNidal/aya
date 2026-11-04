/**
 * Research Dashboard Component:
 * Real-time indicator cards, simulation controls, live time-series charts,
 * and quick scenario configuration overview.
 */

import React from 'react';
import {
  AlertTriangle,
  Award,
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  Download,
  FastForward,
  Info,
  Pause,
  Play,
  RefreshCw,
  Sliders,
  Thermometer,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import { ActiveTab } from './Navigation';
import { exportMultiSheetXLSX } from '../engine/exportImport';
import { ScenarioConfig, SimulationResult, StepMetric } from '../types/simulation';
import { PopulationConfigPanel } from './PopulationConfigPanel';
import { SimulationEvolutionCharts } from './Charts/SimulationEvolutionCharts';

interface DashboardProps {
  config: ScenarioConfig;
  currentStep: number;
  isSimulating: boolean;
  simulationSpeed: number; // 1, 5, 20
  onSpeedChange: (speed: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRunToCompletion: () => void;
  onNewSimulation: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  latestMetric: StepMetric | null;
  metricsHistory: StepMetric[];
  replicationsCompletedCount: number;
  finalResult: SimulationResult | null;
  onUpdatePopulationParams?: (totalPop: number, initialInfected: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  config,
  currentStep,
  isSimulating,
  simulationSpeed,
  onSpeedChange,
  onStart,
  onPause,
  onReset,
  onRunToCompletion,
  onNewSimulation,
  onNavigateTab,
  latestMetric,
  metricsHistory,
  replicationsCompletedCount,
  finalResult,
  onUpdatePopulationParams,
}) => {
  const isCompleted = currentStep >= 540;
  const currentPop = latestMetric?.populationPresent ?? config.initialPopulation;
  const currentInfected = latestMetric?.infectiousCount ?? config.initialInfectedCount;
  const currentSusceptible = latestMetric?.susceptibleCount ?? Math.max(0, config.initialPopulation - config.initialInfectedCount);
  const currentRemoved = latestMetric?.removedCount ?? 0;
  const currentNewInfections = latestMetric?.newInfections ?? 0;
  const currentInfPct = latestMetric?.infectiousPercentage ?? Number(((config.initialInfectedCount / config.initialPopulation) * 100).toFixed(1));
  const currentVisitors = latestMetric?.visitorsPresent ?? 0;
  const currentContacts = latestMetric?.cumulativeContacts ?? 0;
  const instantContacts = latestMetric?.proximityContacts ?? 0;
  const clock = isCompleted ? '18:00' : latestMetric?.clockTime ?? '09:00';
  const temp = latestMetric?.temperature ?? 24.2;
  const rh = latestMetric?.relativeHumidity ?? 52;
  const wind = latestMetric?.windSpeed ?? 1.4;

  const handleExportQuickXLSX = () => {
    if (finalResult) {
      exportMultiSheetXLSX(finalResult, undefined, undefined, `UrbanResilience_${config.id}_Dashboard_${Date.now()}.xlsx`);
    } else if (metricsHistory.length > 0) {
      // Create on-the-fly snapshot result
      const tempResult: SimulationResult = {
        experimentId: `EXP-${config.id}-LIVE-${Date.now()}`,
        scenarioId: config.id,
        scenarioName: config.name,
        replicationIndex: 1,
        seed: config.seed,
        totalSteps: metricsHistory.length,
        metrics: metricsHistory,
        finalMetrics: {
          totalContacts: currentContacts,
          peakInfectious: Math.max(...metricsHistory.map((m) => m.infectiousCount), currentInfected),
          finalInfectious: currentInfected,
          finalInfectiousPercentage: currentInfPct,
          attackRate: currentInfPct,
          totalEpisodes: latestMetric?.contactEpisodes ?? 0,
          avgContactsPerAgent: currentPop > 0 ? Number((currentContacts / currentPop).toFixed(1)) : 0,
        },
        configSnapshot: config,
        completedAt: new Date().toISOString(),
      };
      exportMultiSheetXLSX(tempResult, undefined, undefined, `UrbanResilience_${config.id}_Live_${Date.now()}.xlsx`);
    }
  };

  const [showPopConfig, setShowPopConfig] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Scientific Disclaimer Banner */}
      <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-3 text-amber-200/90 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Avertissement scientifique & reproductibilité :</span>{' '}
          Ce modèle multi-agents étudie la résilience environnementale et spatiale de l’Unité de Voisinage 9 (Ali Mendjeli).
          Les équations de risque sont des <strong className="text-amber-200">hypothèses exploratoires non calibrées sur des données cliniques réelles d’infection</strong>.
          Les indicateurs servent exclusivement à <span className="underline">comparer des tendances relatives entre scénarios d’aménagement</span>.
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* New Simulation */}
          <button
            onClick={onNewSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Nouvelle simulation
          </button>

          {/* Start / Pause / Resume */}
          {!isSimulating ? (
            <button
              onClick={onStart}
              disabled={isCompleted}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition text-white shadow-xs ${
                isCompleted
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {currentStep === 0 ? 'Démarrer (9h)' : 'Reprendre'}
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </button>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
          >
            Réinitialiser
          </button>

          {/* Run 540 steps instant */}
          <button
            onClick={onRunToCompletion}
            disabled={isCompleted}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              isCompleted
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            Calculer les 540 pas (Instantané)
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60 ml-2">
            <span className="text-slate-400 text-xs mr-1 font-medium">Vitesse :</span>
            {[1, 5, 20].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-2 py-0.5 text-xs font-mono font-medium rounded ${
                  simulationSpeed === spd
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Toggle Population Configuration Panel */}
          {onUpdatePopulationParams && (
            <button
              onClick={() => setShowPopConfig((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border transition ml-2 ${
                showPopConfig
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border-emerald-700/50'
              }`}
              title="Configurer la population totale et le nombre d'infectés au départ"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-300" />
              <span>Régler Population ({config.initialPopulation} hab. / {config.initialInfectedCount} inf.)</span>
            </button>
          )}
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('comparison')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
          >
            <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
            Comparer scénarios
          </button>

          <button
            onClick={() => onNavigateTab('replications')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Lancer réplications
          </button>

          <button
            onClick={handleExportQuickXLSX}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter XLSX
          </button>

          <button
            onClick={() => onNavigateTab('documentation')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
          >
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Hypothèses
          </button>
        </div>
      </div>

      {/* POPULATION CONTROL PANEL (Collapsible or directly toggleable) */}
      {showPopConfig && onUpdatePopulationParams && (
        <div className="transition-all animate-fadeIn">
          <PopulationConfigPanel
            currentTotalPopulation={config.initialPopulation}
            currentInitialInfected={config.initialInfectedCount}
            isSimulating={isSimulating}
            currentStep={currentStep}
            onApply={(tot, inf) => {
              onUpdatePopulationParams(tot, inf);
              setShowPopConfig(false);
            }}
          />
        </div>
      )}

      {/* 2 COMPTEURS PRINCIPAUX DEMANDÉS (HERO CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* COMPTEUR 1 : POPULATION TOTALE */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/50 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/90 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Indicateur Principal 1 · Recensement
                </span>
                <h3 className="text-lg font-extrabold text-white">Population Totale</h3>
              </div>
            </div>
            {onUpdatePopulationParams && (
              <button
                onClick={() => setShowPopConfig((p) => !p)}
                className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800/90 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 transition flex items-center gap-1"
                title="Modifier le nombre de personnes à simuler"
              >
                <Sliders className="w-3 h-3" />
                <span>Modifier ({config.initialPopulation})</span>
              </button>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
              {currentPop}
            </div>
            <div className="text-sm font-semibold text-slate-300">
              personnes dans le quartier UV9
            </div>
          </div>

          {/* Répartition de la population : Sain (Vert), Rétabli/Exposé (Jaune), Visiteurs */}
          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-emerald-950/50 border border-emerald-700/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                <span>Saines</span>
              </div>
              <div className="text-lg font-bold text-emerald-300 font-mono">
                {currentSusceptible}
              </div>
              <div className="text-[10px] text-emerald-400/80">
                {currentPop > 0 ? ((currentSusceptible / currentPop) * 100).toFixed(1) : 0}% du total
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
                <span>Exposées / Rétablies</span>
              </div>
              <div className="text-lg font-bold text-amber-300 font-mono">
                {currentRemoved}
              </div>
              <div className="text-[10px] text-amber-400/80">
                {currentPop > 0 ? ((currentRemoved / currentPop) * 100).toFixed(1) : 0}% du total
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Visiteurs extérieurs</span>
              </div>
              <div className="text-lg font-bold text-slate-100 font-mono">
                {currentVisitors}
              </div>
              <div className="text-[10px] text-slate-400">
                Flux pendulaire
              </div>
            </div>
          </div>
        </div>

        {/* COMPTEUR 2 : NOMBRE DE PERSONNES INFECTÉES */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-2 border-rose-500/50 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-950/90 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  Indicateur Principal 2 · Propagation Virale
                </span>
                <h3 className="text-lg font-extrabold text-white">Personnes Infectées</h3>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-rose-950/90 text-rose-300 text-xs font-bold font-mono border border-rose-700/70">
              {currentInfPct}% actif
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <div className="text-4xl sm:text-5xl font-black text-rose-400 font-mono tracking-tight">
              {currentInfected}
            </div>
            <div className="text-sm font-semibold text-slate-300">
              personnes actuellement infectées (Rouge)
            </div>
          </div>

          {/* Métriques d'infection détaillées */}
          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-rose-950/50 border border-rose-700/50 rounded-lg p-2.5">
              <div className="text-slate-400 font-medium mb-0.5">Infectés au départ (I₀)</div>
              <div className="text-lg font-bold text-rose-300 font-mono">
                {config.initialInfectedCount}
              </div>
              <div className="text-[10px] text-slate-400">
                Patient(s) source(s)
              </div>
            </div>

            <div className="bg-rose-950/40 border border-rose-700/40 rounded-lg p-2.5">
              <div className="text-slate-400 font-medium mb-0.5">Nouveaux cas (pas)</div>
              <div className="text-lg font-bold text-amber-300 font-mono">
                +{currentNewInfections}
              </div>
              <div className="text-[10px] text-slate-400">
                À la minute {currentStep}
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-2.5">
              <div className="text-slate-400 font-medium mb-0.5">Modèle utilisé</div>
              <div className="text-base font-bold text-indigo-300 font-mono">
                {config.epidemicModel}
              </div>
              <div className="text-[10px] text-slate-400">
                Seuil: {config.contamination.contactDistanceThresholdMeters}m
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SYNCHRONIZED EVOLUTION CHARTS : Graphique 1 (Population) & Graphique 2 (Infections) */}
      <SimulationEvolutionCharts
        metrics={metricsHistory}
        currentStep={currentStep}
        initialPopulation={config.initialPopulation}
        initialInfectedCount={config.initialInfectedCount}
      />

      {/* Primary Indicator Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: Population */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Population</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{currentPop}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Visiteurs :</span>
            <span className="text-amber-400 font-mono font-medium">{currentVisitors}</span>
          </div>
        </div>

        {/* Card 2: Cumulative Contacts */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Contacts cumulés</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">{currentContacts.toLocaleString('fr-FR')}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Instantanés :</span>
            <span className="text-slate-300 font-mono">{instantContacts}</span>
          </div>
        </div>

        {/* Card 3: Infectious Agents (I) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">État infectieux (I)</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">{currentInfected}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Initial (I₀) :</span>
            <span className="text-slate-300 font-mono">{config.initialInfectedCount}</span>
          </div>
        </div>

        {/* Card 4: % Infectious */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">% Infectieux</span>
            <BarChart2 className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{currentInfPct}%</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Modèle :</span>
            <span className="text-indigo-400 font-mono font-medium">{config.epidemicModel}</span>
          </div>
        </div>

        {/* Card 5: Clock & Simulated Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Heure simulée</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400 font-mono">{clock}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Durée :</span>
            <span className="text-slate-300 font-mono">{currentStep} / 540 min</span>
          </div>
        </div>

        {/* Card 6: Microclimat */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Température</span>
            <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{temp}°C</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>HR : {rh}%</span>
            <span>Vent : {wind}m/s</span>
          </div>
        </div>

        {/* Card 7: Active Scenario */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Scénario actif</span>
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-indigo-400 font-mono">{config.id}</div>
          <div className="text-xs text-slate-400 mt-1 truncate" title={config.name}>
            {config.name.split('—')[1] || config.name}
          </div>
        </div>

        {/* Card 8: Replications Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Réplications</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{replicationsCompletedCount}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Graine :</span>
            <span className="text-slate-400 font-mono">{config.seed}</span>
          </div>
        </div>
      </div>

      {/* Scenario Parameters Snapshot & Spatial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Live Time Series Charts */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Évolution dynamique de la simulation</h2>
              <p className="text-xs text-slate-400">
                Suivi minute par minute des contacts de proximité et de la propagation (09:00 à 18:00)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2.5 h-0.5 bg-amber-400 rounded-full inline-block" /> Contacts cumulés
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2.5 h-0.5 bg-rose-400 rounded-full inline-block" /> Agents infectieux (I)
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="h-64 w-full bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 relative flex flex-col justify-between">
            {metricsHistory.length < 2 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                <BarChart2 className="w-8 h-8 text-slate-600 mb-2" />
                <span>Cliquez sur « Démarrer » ou « Calculer les 540 pas » pour tracer la courbe temporelle.</span>
              </div>
            ) : (
              <LiveTimeSeriesSVG metrics={metricsHistory} />
            )}

            {/* X-axis time milestones */}
            <div className="flex justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/60">
              <span>09:00 (Pas 0)</span>
              <span>11:15 (Pas 135)</span>
              <span>13:30 (Pas 270)</span>
              <span>15:45 (Pas 405)</span>
              <span>18:00 (Pas 540)</span>
            </div>
          </div>

          {/* Microclimatic Bar Graph */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">T°C ENVI-met :</span>
              <span className="font-mono text-emerald-400 font-semibold">{temp} °C</span>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">Humidité RH :</span>
              <span className="font-mono text-sky-400 font-semibold">{rh} %</span>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">Vitesse du vent :</span>
              <span className="font-mono text-indigo-400 font-semibold">{wind} m/s</span>
            </div>
          </div>
        </div>

        {/* Right: Active Scenario Configuration Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Paramètres actifs
                </span>
                <h3 className="text-base font-semibold text-white mt-0.5">{config.name}</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                {config.id}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">{config.details}</p>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Marché informel :</span>
                <span className={`font-medium ${config.marketRelocated ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {config.marketRelocated ? 'Relocalisé Esplanade Sud (Rue D)' : 'Implanté sur Rue A (Goulot central)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Végétation d’ombrage :</span>
                <span className={`font-medium ${config.additionalVegetation ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {config.additionalVegetation ? 'Canopée arborée Rue A & Parc SW' : 'Végétation existante éparse'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Charge Rue A (Commerciale) :</span>
                <span className="font-mono text-slate-200">
                  {Math.round(config.flowMultiplierByStreet.RueA * 100)}% ({Math.round(420 * config.flowMultiplierByStreet.RueA)} piétons/h)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Charge Rues B & C (Résid./Calme) :</span>
                <span className="font-mono text-slate-200">
                  {Math.round(config.flowMultiplierByStreet.RueB * 100)}% / {Math.round(config.flowMultiplierByStreet.RueC * 100)}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Distance seuil de contact :</span>
                <span className="font-mono text-slate-200">{config.contamination.contactDistanceThresholdMeters} m</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Taux p_base (risque/min) :</span>
                <span className="font-mono text-slate-200">{config.contamination.baseTransmissionRatePerMinute}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab('spatial')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Voir le plan spatial interactif UV9 & 3D
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lightweight SVG time-series renderer
 */
const LiveTimeSeriesSVG: React.FC<{ metrics: StepMetric[] }> = ({ metrics }) => {
  if (metrics.length < 2) return null;

  const width = 800;
  const height = 220;
  const padding = { top: 15, right: 20, bottom: 25, left: 45 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxContacts = Math.max(...metrics.map((m) => m.cumulativeContacts), 50);
  const maxInfected = Math.max(...metrics.map((m) => m.infectiousCount), 20);

  // Downsample to max 120 points for smooth SVG
  const stride = Math.max(1, Math.floor(metrics.length / 120));
  const sampled = metrics.filter((_, idx) => idx % stride === 0 || idx === metrics.length - 1);

  const getX = (step: number) => padding.left + (step / 540) * plotW;
  const getYContacts = (val: number) => padding.top + plotH - (val / maxContacts) * plotH;
  const getYInfected = (val: number) => padding.top + plotH - (val / maxInfected) * plotH;

  const contactsPath = sampled
    .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(m.step).toFixed(1)} ${getYContacts(m.cumulativeContacts).toFixed(1)}`)
    .join(' ');

  const infectedPath = sampled
    .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(m.step).toFixed(1)} ${getYInfected(m.infectiousCount).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#334155" strokeDasharray="3 3" />
      <line x1={padding.left} y1={padding.top + plotH / 2} x2={width - padding.right} y2={padding.top + plotH / 2} stroke="#334155" strokeDasharray="3 3" />
      <line x1={padding.left} y1={padding.top + plotH} x2={width - padding.right} y2={padding.top + plotH} stroke="#475569" />

      {/* Contacts Curve (Amber) */}
      <path d={contactsPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

      {/* Infected Curve (Rose) */}
      <path d={infectedPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />

      {/* Current point dots */}
      {sampled.length > 0 && (
        <>
          <circle
            cx={getX(sampled[sampled.length - 1].step)}
            cy={getYContacts(sampled[sampled.length - 1].cumulativeContacts)}
            r="4"
            fill="#f59e0b"
          />
          <circle
            cx={getX(sampled[sampled.length - 1].step)}
            cy={getYInfected(sampled[sampled.length - 1].infectiousCount)}
            r="4"
            fill="#f43f5e"
          />
        </>
      )}

      {/* Y-axis Labels */}
      <text x={padding.left - 8} y={padding.top + 10} textAnchor="end" fill="#f59e0b" fontSize="10" fontFamily="monospace">
        {maxContacts.toLocaleString('fr-FR')}
      </text>
      <text x={padding.left - 8} y={padding.top + plotH / 2 + 4} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
        {Math.round(maxContacts / 2).toLocaleString('fr-FR')}
      </text>
      <text x={padding.left - 8} y={padding.top + plotH} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
        0
      </text>

      {/* Secondary Y-axis for Infectious */}
      <text x={width - padding.right + 6} y={padding.top + 10} textAnchor="start" fill="#f43f5e" fontSize="10" fontFamily="monospace">
        {maxInfected} I
      </text>
    </svg>
  );
};
