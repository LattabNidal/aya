/**
 * Statistical Replications View (Mode C):
 * 30 replications per scenario, recorded seeds, descriptive statistics,
 * Student-t 95% confidence intervals, temporal mean curves with uncertainty bands,
 * individual spaghetti replication traces, and null-safe S0-S4 comparison.
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Layers,
  List,
  Play,
  RotateCcw,
  Sliders,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { exportMultiSheetXLSX, exportResultsToCSV } from '../engine/exportImport';
import { SCENARIO_PRESETS } from '../engine/scenarios';
import { computePairedComparison, runScenarioReplications } from '../engine/statisticsEngine';
import {
  ReplicationRunDetail,
  ScenarioId,
  ScenarioReplicationStats,
  SimulationResult,
} from '../types/simulation';

interface ReplicationsViewProps {
  onNotifyReplicationsDone: (count: number, stats: ScenarioReplicationStats[]) => void;
  sharedScenarioStats?: ScenarioReplicationStats[];
}

const SCENARIO_COLORS: Record<ScenarioId, string> = {
  S0: '#94a3b8', // slate
  S1: '#10b981', // emerald
  S2: '#38bdf8', // sky
  S3: '#a855f7', // purple
  S4: '#f59e0b', // amber
};

export const ReplicationsView: React.FC<ReplicationsViewProps> = ({
  onNotifyReplicationsDone,
  sharedScenarioStats,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>('S0');
  const [replicationsTarget, setReplicationsTarget] = useState<number>(30); // 30 par défaut
  const [usePairedSeeds, setUsePairedSeeds] = useState<boolean>(true);
  const [baseSeed, setBaseSeed] = useState<number>(42);

  // Sub-tab selection
  const [activeSubView, setActiveSubView] = useState<'uncertainty' | 'traces' | 'tableRuns' | 'comparisonS0S4'>('uncertainty');
  const [metricToDisplay, setMetricToDisplay] = useState<'contacts' | 'infected'>('contacts');
  const [uncertaintyType, setUncertaintyType] = useState<'sd' | 'ci95'>('sd');
  const [showIndividualSpaghetti, setShowIndividualSpaghetti] = useState<boolean>(true);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 30 });
  const [allScenarioStats, setAllScenarioStats] = useState<ScenarioReplicationStats[]>(() => sharedScenarioStats || []);
  const [activeResults, setActiveResults] = useState<SimulationResult[]>([]);

  // Launch batch for single selected scenario
  const handleLaunchSingleBatch = () => {
    setIsRunning(true);
    setProgress({ completed: 0, total: replicationsTarget });

    setTimeout(() => {
      const cfg = SCENARIO_PRESETS[selectedScenarioId];
      const { results, stats } = runScenarioReplications(
        cfg,
        replicationsTarget,
        baseSeed,
        (c, t) => setProgress({ completed: c, total: t })
      );

      setActiveResults(results);

      setAllScenarioStats((prev) => {
        const filtered = prev.filter((s) => s.scenarioId !== selectedScenarioId);
        const updated = [...filtered, stats];
        const withDeltas = computePairedComparison(updated, 'S0');
        onNotifyReplicationsDone(withDeltas.reduce((acc, s) => acc + s.replicationCount, 0), withDeltas);
        return withDeltas;
      });

      setIsRunning(false);
    }, 60);
  };

  // Launch batch for ALL 5 scenarios S0 to S4 (5 x 30 = 150 runs)
  const handleLaunchAllFiveScenarios = () => {
    setIsRunning(true);
    const scenarioIds: ScenarioId[] = ['S0', 'S1', 'S2', 'S3', 'S4'];
    const totalRuns = scenarioIds.length * replicationsTarget;
    setProgress({ completed: 0, total: totalRuns });

    setTimeout(() => {
      const compiledStats: ScenarioReplicationStats[] = [];
      const compiledResults: SimulationResult[] = [];
      let totalCompleted = 0;

      for (const id of scenarioIds) {
        const cfg = SCENARIO_PRESETS[id];
        const currentBaseSeed = usePairedSeeds ? baseSeed : baseSeed + Math.floor(Math.random() * 50000);
        const { results, stats } = runScenarioReplications(
          cfg,
          replicationsTarget,
          currentBaseSeed,
          () => {
            totalCompleted++;
            setProgress({ completed: totalCompleted, total: totalRuns });
          }
        );
        compiledStats.push(stats);
        if (id === selectedScenarioId) {
          compiledResults.push(...results);
        }
      }

      const withDeltas = computePairedComparison(compiledStats, 'S0');
      setAllScenarioStats(withDeltas);
      if (compiledResults.length > 0) {
        setActiveResults(compiledResults);
      }
      onNotifyReplicationsDone(totalRuns, withDeltas);
      setIsRunning(false);
    }, 60);
  };

  const currentStats = allScenarioStats.find((s) => s.scenarioId === selectedScenarioId);

  const handleExportXLSX = () => {
    if (activeResults.length > 0) {
      exportMultiSheetXLSX(
        activeResults[0],
        allScenarioStats,
        undefined,
        `UrbanResilience_30Replications_${selectedScenarioId}_${Date.now()}.xlsx`
      );
    } else if (allScenarioStats.length > 0) {
      // export comparison CSV
      alert('Veuillez lancer une réplication pour ce scénario pour générer le classeur complet.');
    }
  };

  const handleExportReplicationsCSV = () => {
    if (activeResults.length > 0) {
      exportResultsToCSV(activeResults, `UrbanResilience_Replications_${selectedScenarioId}_${Date.now()}.csv`);
    } else {
      alert('Aucune exécution enregistrée à exporter.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h2 className="text-base font-semibold text-white">Mode C : Expériences avec 30 Réplications par Scénario</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Évaluation stochastique rigoureuse, graines explicites, statistiques descriptives complètes et comparaison relative S0–S4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLaunchSingleBatch}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white shadow-xs transition ${
                isRunning ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Lancer {replicationsTarget} réplications ({selectedScenarioId})
            </button>

            <button
              onClick={handleLaunchAllFiveScenarios}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white shadow-xs transition ${
                isRunning ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Exécuter les 5 scénarios (5 × {replicationsTarget} = {5 * replicationsTarget} runs)
            </button>

            {currentStats && (
              <button
                onClick={handleExportXLSX}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                XLSX
              </button>
            )}
          </div>
        </div>

        {/* Parameters Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Scenario Selector */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Scénario analysé :</label>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-700">
              {(['S0', 'S1', 'S2', 'S3', 'S4'] as ScenarioId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedScenarioId(id)}
                  className={`flex-1 py-1 font-mono font-semibold rounded transition ${
                    selectedScenarioId === id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

          {/* Replications Target */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Nombre de réplications (N) :</label>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-700">
              {[20, 25, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setReplicationsTarget(n)}
                  className={`flex-1 py-1 font-mono font-medium rounded transition ${
                    replicationsTarget === n ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {n} {n === 30 ? '(Défaut)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* PRNG Base Seed */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Graine de départ (PRNG Base Seed) :</label>
            <input
              type="number"
              value={baseSeed}
              onChange={(e) => setBaseSeed(parseInt(e.target.value) || 42)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono"
            />
          </div>

          {/* Paired Seeds Toggle */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Graines communes (Plan apparié) :</label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="checkbox"
                id="pairedCheck"
                checked={usePairedSeeds}
                onChange={(e) => setUsePairedSeeds(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-0"
              />
              <label htmlFor="pairedCheck" className="text-slate-300 cursor-pointer">
                Activer les graines identiques entre S0..S4
              </label>
            </div>
          </div>
        </div>

        {/* Progress Bar when running */}
        {isRunning && (
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Calcul des réplications stochastiques en cours...</span>
              <span className="font-mono text-emerald-400">
                {progress.completed} / {progress.total} (
                {Math.round((progress.completed / (progress.total || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${(progress.completed / (progress.total || 1)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sub-view Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubView('uncertainty')}
            className={`px-3 py-1 font-medium rounded transition flex items-center gap-1.5 ${
              activeSubView === 'uncertainty' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Courbes & Bandes d'incertitude
          </button>
          <button
            onClick={() => setActiveSubView('traces')}
            className={`px-3 py-1 font-medium rounded transition flex items-center gap-1.5 ${
              activeSubView === 'traces' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            30 Trajectoires individuelles (Spaghetti)
          </button>
          <button
            onClick={() => setActiveSubView('tableRuns')}
            className={`px-3 py-1 font-medium rounded transition flex items-center gap-1.5 ${
              activeSubView === 'tableRuns' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tableau des 30 graines & résultats
          </button>
          <button
            onClick={() => setActiveSubView('comparisonS0S4')}
            className={`px-3 py-1 font-medium rounded transition flex items-center gap-1.5 ${
              activeSubView === 'comparisonS0S4' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Comparaison S0–S4 & Tests appariés
          </button>
        </div>

        {/* Chart View Controls (when in chart view) */}
        {(activeSubView === 'uncertainty' || activeSubView === 'traces') && (
          <div className="flex items-center gap-3 text-xs">
            {/* Metric Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => setMetricToDisplay('contacts')}
                className={`px-2 py-0.5 rounded font-medium ${
                  metricToDisplay === 'contacts' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Contacts cumulés
              </button>
              <button
                onClick={() => setMetricToDisplay('infected')}
                className={`px-2 py-0.5 rounded font-medium ${
                  metricToDisplay === 'infected' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Infectieux (I)
              </button>
            </div>

            {/* Uncertainty Type Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => setUncertaintyType('sd')}
                className={`px-2 py-0.5 rounded font-medium ${
                  uncertaintyType === 'sd' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Dispersion inter-réplications (± 1 Écart-type)"
              >
                ± 1 SD (Dispersion)
              </button>
              <button
                onClick={() => setUncertaintyType('ci95')}
                className={`px-2 py-0.5 rounded font-medium ${
                  uncertaintyType === 'ci95' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Intervalle de confiance à 95% de la moyenne (t_29 x SE)"
              >
                IC 95% (Incertitude moyenne)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-View 1: Uncertainty Band Chart (Graphique 4) */}
      {activeSubView === 'uncertainty' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Moyenne temporelle et enveloppe d'incertitude ({selectedScenarioId})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bande d'incertitude : {uncertaintyType === 'sd' ? '± 1 Écart-type (SD)' : 'Intervalle de confiance à 95% (Student-t)'} sur les {currentStats?.replicationCount || 30} réplications.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium font-mono">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Courbe moyenne µ(t)
              </span>
              <span className="flex items-center gap-1.5 text-amber-300/60 font-medium font-mono">
                <span className="w-3 h-2 bg-amber-400/30 rounded inline-block" /> Bande d'incertitude
              </span>
            </div>
          </div>

          {currentStats ? (
            <div className="h-80 w-full bg-slate-950/70 rounded-lg p-3 border border-slate-800/80 flex flex-col justify-between">
              <UncertaintyBandSVG
                stats={currentStats}
                metricType={metricToDisplay}
                uncertaintyType={uncertaintyType}
                showIndividualTraces={false}
              />
              <div className="flex justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/60">
                <span>09:00 (Pas 0)</span>
                <span>11:15 (Pas 135)</span>
                <span>13:30 (Pas 270)</span>
                <span>15:45 (Pas 405)</span>
                <span>18:00 (Pas 540)</span>
              </div>
            </div>
          ) : (
            <div className="h-56 bg-slate-950/50 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
              <Layers className="w-8 h-8 text-slate-600 mb-2" />
              <span>Aucune réplication exécutée pour {selectedScenarioId}.</span>
              <span className="text-slate-400 mt-1">
                Cliquez sur « Lancer 30 réplications ({selectedScenarioId}) » pour générer la moyenne temporelle et la bande d'incertitude.
              </span>
            </div>
          )}

          {/* Descriptive Statistics Card Grid */}
          {currentStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs">
                <span className="text-slate-400">Moyenne (µ) :</span>
                <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                  {currentStats.meanFinalContacts.toLocaleString('fr-FR')}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs">
                <span className="text-slate-400">Écart-type (SD) :</span>
                <div className="text-base font-bold text-slate-300 font-mono mt-0.5">
                  ±{currentStats.sdFinalContacts}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs">
                <span className="text-slate-400">Erreur-type (SE) :</span>
                <div className="text-base font-bold text-sky-400 font-mono mt-0.5">
                  ±{currentStats.seFinalContacts}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs">
                <span className="text-slate-400">Médiane [IQR] :</span>
                <div className="text-base font-bold text-slate-300 font-mono mt-0.5">
                  {currentStats.medianFinalContacts} <span className="text-xs text-slate-500">[{currentStats.iqrFinalContacts}]</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs">
                <span className="text-slate-400">Étendue [Min - Max] :</span>
                <div className="text-base font-bold text-slate-300 font-mono mt-0.5">
                  [{currentStats.minFinalContacts} - {currentStats.maxFinalContacts}]
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs">
                <span className="text-slate-400">IC 95% de la moyenne :</span>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  [{currentStats.ci95FinalContacts[0]} ; {currentStats.ci95FinalContacts[1]}]
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-View 2: Individual 30 Replication Traces (Spaghetti Plot) */}
      {activeSubView === 'traces' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Trajectoires individuelles des 30 réplications (Spaghetti plot) vs Moyenne
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distingue la trajectoire propre de chaque simulation stochastique (traits fins) de la tendance moyenne robuste (trait gras).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-500/60 inline-block" /> 30 Trajectoires individuelles
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-3 h-1 bg-amber-400 inline-block" /> Moyenne temporelle µ(t)
              </span>
            </div>
          </div>

          {currentStats ? (
            <div className="h-80 w-full bg-slate-950/70 rounded-lg p-3 border border-slate-800/80 flex flex-col justify-between">
              <UncertaintyBandSVG
                stats={currentStats}
                metricType={metricToDisplay}
                uncertaintyType={uncertaintyType}
                showIndividualTraces={true}
              />
              <div className="flex justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/60">
                <span>09:00</span>
                <span>11:15</span>
                <span>13:30</span>
                <span>15:45</span>
                <span>18:00</span>
              </div>
            </div>
          ) : (
            <div className="h-56 bg-slate-950/50 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
              <Layers className="w-8 h-8 text-slate-600 mb-2" />
              <span>Aucune réplication exécutée pour {selectedScenarioId}.</span>
            </div>
          )}
        </div>
      )}

      {/* Sub-View 3: Detailed Table of all 30 Replications (Graines et indicateurs individuels) */}
      {activeSubView === 'tableRuns' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-3">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Inventaire détaillé des {currentStats?.replicationsDetails.length || 0} réplications stochastiques ({selectedScenarioId})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Chaque ligne correspond à une journée simulée indépendante avec sa graine (Seed) Mulberry32 enregistrée.
              </p>
            </div>
            {activeResults.length > 0 && (
              <button
                onClick={handleExportReplicationsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter CSV des réplications
              </button>
            )}
          </div>

          {currentStats && currentStats.replicationsDetails.length > 0 ? (
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-sans">Réplication #</th>
                    <th className="py-2.5 px-3">Graine (Seed)</th>
                    <th className="py-2.5 px-3 text-right">Contacts Finaux</th>
                    <th className="py-2.5 px-3 text-right">Infectieux (I)</th>
                    <th className="py-2.5 px-3 text-right">% Infectieux</th>
                    <th className="py-2.5 px-3 text-right">Pic Infectieux</th>
                    <th className="py-2.5 px-3 text-right">Taux d'attaque (%)</th>
                    <th className="py-2.5 px-3 text-right">Épisodes de contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentStats.replicationsDetails.map((run) => (
                    <tr key={run.repIndex} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-bold text-white font-sans">
                        Run #{run.repIndex}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{run.seed}</td>
                      <td className="py-2 px-3 text-right text-amber-400 font-semibold">
                        {run.finalContacts.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-400 font-semibold">
                        {run.finalInfected}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {run.finalInfectedPercent}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {run.peakInfected}
                      </td>
                      <td className="py-2 px-3 text-right text-indigo-400">
                        {run.attackRate}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {run.totalEpisodes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Aucune donnée de réplication disponible. Cliquez sur « Lancer 30 réplications ».
            </div>
          )}
        </div>
      )}

      {/* Sub-View 4: Complete S0 to S4 Comparison & Paired Statistical Tests */}
      {activeSubView === 'comparisonS0S4' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
          <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Comparaison multi-scénarios S0–S4 avec gestion rigoureuse des références nulles
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Formule : Variation relative (%) = 100 × (valeur_scénario - valeur_S0) / valeur_S0. Si référence = 0, affiche « non calculable ».
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {allScenarioStats.length} / 5 scénarios calculés
            </span>
          </div>

          {allScenarioStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 font-sans">Scénario</th>
                    <th className="py-3 px-2 text-right">Runs</th>
                    <th className="py-3 px-3 text-right">Moyenne Contacts (µ ± SD)</th>
                    <th className="py-3 px-3 text-right">IC 95% Contacts</th>
                    <th className="py-3 px-3 text-right">Δ Contacts vs S0</th>
                    <th className="py-3 px-3 text-right">Diff. Moyenne [IC 95%]</th>
                    <th className="py-3 px-3 text-right">p-value (t-test)</th>
                    <th className="py-3 px-3 text-right">Moyenne Infectés (I)</th>
                    <th className="py-3 px-3 text-right">Δ Infectés vs S0</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allScenarioStats.map((st) => {
                    const isS0 = st.scenarioId === 'S0';
                    const color = SCENARIO_COLORS[st.scenarioId];

                    return (
                      <tr key={st.scenarioId} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-white font-sans flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          {st.scenarioId} — {st.scenarioName.split('—')[1]}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-400">{st.replicationCount}</td>
                        <td className="py-3 px-3 text-right text-amber-400 font-bold">
                          {st.meanFinalContacts.toLocaleString('fr-FR')}{' '}
                          <span className="text-slate-400 text-xs font-normal">±{st.sdFinalContacts}</span>
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400">
                          [{st.ci95FinalContacts[0]} ; {st.ci95FinalContacts[1]}]
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isS0 ? (
                            <span className="text-slate-500 font-normal">Référence (0%)</span>
                          ) : st.deltaContactsVsS0Percent === 'non calculable' ? (
                            <span className="text-slate-500 italic">non calculable</span>
                          ) : typeof st.deltaContactsVsS0Percent === 'number' && st.deltaContactsVsS0Percent < 0 ? (
                            <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              {st.deltaContactsVsS0Percent}%
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold flex items-center justify-end gap-1">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              +{st.deltaContactsVsS0Percent}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300">
                          {isS0 ? (
                            <span className="text-slate-500">-</span>
                          ) : st.pairedDeltaContactsVsS0 ? (
                            <span>
                              {st.pairedDeltaContactsVsS0.meanDiff > 0 ? '+' : ''}
                              {Math.round(st.pairedDeltaContactsVsS0.meanDiff)}{' '}
                              <span className="text-slate-500 text-xs">
                                [{Math.round(st.pairedDeltaContactsVsS0.ci95[0])};{Math.round(st.pairedDeltaContactsVsS0.ci95[1])}]
                              </span>
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isS0 ? (
                            <span className="text-slate-500">-</span>
                          ) : st.pairedDeltaContactsVsS0?.pValueEstimate !== undefined ? (
                            <span
                              className={`font-semibold ${
                                st.pairedDeltaContactsVsS0.pValueEstimate < 0.001
                                  ? 'text-emerald-400'
                                  : st.pairedDeltaContactsVsS0.pValueEstimate < 0.05
                                  ? 'text-sky-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {st.pairedDeltaContactsVsS0.pValueEstimate < 0.0001
                                ? 'p < 0.0001 ***'
                                : `p = ${st.pairedDeltaContactsVsS0.pValueEstimate.toFixed(4)}`}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-400 font-semibold">
                          {st.meanFinalInfected} (±{st.sdFinalInfected})
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isS0 ? (
                            <span className="text-slate-500 font-normal">Référence</span>
                          ) : st.deltaInfectedVsS0Percent === 'non calculable' ? (
                            <span className="text-slate-500 italic">non calculable</span>
                          ) : typeof st.deltaInfectedVsS0Percent === 'number' && st.deltaInfectedVsS0Percent < 0 ? (
                            <span className="text-emerald-400 font-bold">
                              {st.deltaInfectedVsS0Percent}%
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold">
                              +{st.deltaInfectedVsS0Percent}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Aucune réplication enregistrée. Cliquez sur « Exécuter les 5 scénarios » pour générer la matrice comparative complète.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced SVG chart supporting Mean curve, Shaded Uncertainty Ribbon (± 1 SD or 95% CI),
 * and individual 30 replication traces (spaghetti plot).
 */
const UncertaintyBandSVG: React.FC<{
  stats: ScenarioReplicationStats;
  metricType: 'contacts' | 'infected';
  uncertaintyType: 'sd' | 'ci95';
  showIndividualTraces: boolean;
}> = ({ stats, metricType, uncertaintyType, showIndividualTraces }) => {
  const width = 850;
  const height = 260;
  const padding = { top: 20, right: 35, bottom: 25, left: 60 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const {
    minutes,
    contactsMean,
    contactsSd,
    contactsSe,
    contactsCi95Lower,
    contactsCi95Upper,
    infectedMean,
    infectedSd,
    infectedSe,
    infectedCi95Lower,
    infectedCi95Upper,
    individualTraces,
  } = stats.timeSeriesMean;

  if (!minutes || minutes.length === 0) return null;

  const isContacts = metricType === 'contacts';
  const meanArr = isContacts ? contactsMean : infectedMean;
  const sdArr = isContacts ? contactsSd : infectedSd;
  const seArr = isContacts ? contactsSe : infectedSe;
  const ciLowerArr = isContacts ? contactsCi95Lower : infectedCi95Lower;
  const ciUpperArr = isContacts ? contactsCi95Upper : infectedCi95Upper;

  // Global scale max
  let maxVal = 10;
  for (let i = 0; i < meanArr.length; i++) {
    const top = meanArr[i] + (sdArr[i] || 0) * 1.2;
    if (top > maxVal) maxVal = top;
  }
  // Check individual traces max
  if (showIndividualTraces && individualTraces) {
    for (const tr of individualTraces) {
      const arr = isContacts ? tr.contacts : tr.infected;
      for (const v of arr) {
        if (v > maxVal) maxVal = v;
      }
    }
  }

  const getX = (min: number) => padding.left + (min / 540) * plotW;
  const getY = (val: number) => padding.top + plotH - (Math.max(0, val) / (maxVal || 1)) * plotH;

  // Determine uncertainty envelope bounds
  const upperPoints = minutes.map((m, i) => {
    const val = uncertaintyType === 'sd' ? meanArr[i] + (sdArr[i] || 0) : ciUpperArr[i];
    return { x: getX(m), y: getY(val) };
  });

  const lowerPoints = minutes
    .map((m, i) => {
      const val = uncertaintyType === 'sd' ? Math.max(0, meanArr[i] - (sdArr[i] || 0)) : Math.max(0, ciLowerArr[i]);
      return { x: getX(m), y: getY(val) };
    })
    .reverse();

  const bandPathD =
    upperPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ' ' +
    lowerPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ' Z';

  const meanPathD = minutes
    .map((m, i) => `${i === 0 ? 'M' : 'L'} ${getX(m).toFixed(1)} ${getY(meanArr[i]).toFixed(1)}`)
    .join(' ');

  const primaryColor = isContacts ? '#f59e0b' : '#f43f5e';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
      {/* Grid lines */}
      <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#334155" strokeDasharray="3 3" />
      <line x1={padding.left} y1={padding.top + plotH / 2} x2={width - padding.right} y2={padding.top + plotH / 2} stroke="#334155" strokeDasharray="3 3" />
      <line x1={padding.left} y1={padding.top + plotH} x2={width - padding.right} y2={padding.top + plotH} stroke="#475569" />

      {/* Uncertainty Ribbon */}
      <path d={bandPathD} fill={primaryColor} fillOpacity={showIndividualTraces ? '0.12' : '0.22'} />

      {/* Individual 30 replication traces (Spaghetti plot) */}
      {showIndividualTraces &&
        individualTraces &&
        individualTraces.map((tr) => {
          const arr = isContacts ? tr.contacts : tr.infected;
          if (arr.length < 2) return null;
          const trPath = minutes
            .map((m, i) => `${i === 0 ? 'M' : 'L'} ${getX(m).toFixed(1)} ${getY(arr[i] ?? arr[arr.length - 1]).toFixed(1)}`)
            .join(' ');
          return (
            <path
              key={`tr_${tr.repIndex}`}
              d={trPath}
              fill="none"
              stroke={primaryColor}
              strokeWidth="0.8"
              strokeOpacity="0.25"
            />
          );
        })}

      {/* Bold Mean Curve */}
      <path d={meanPathD} fill="none" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" />

      {/* Embedded Chart Legend */}
      <g transform={`translate(${padding.left + 15}, ${padding.top + 15})`}>
        <rect width="240" height="42" fill="#0f172a" fillOpacity="0.9" rx="4" stroke="#334155" />
        <line x1="10" y1="14" x2="30" y2="14" stroke={primaryColor} strokeWidth="3" />
        <text x="38" y="17" fill={primaryColor} fontSize="9" fontFamily="sans-serif" fontWeight="bold">
          Moyenne temporelle µ(t) ({isContacts ? 'Contacts' : 'Infectés I'})
        </text>
        <rect x="10" y="24" width="20" height="10" fill={primaryColor} fillOpacity="0.3" stroke={primaryColor} strokeWidth="0.5" />
        <text x="38" y="32" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
          {uncertaintyType === 'sd' ? 'Bande de dispersion ± 1 SD' : 'Intervalle de confiance à 95% (SE × t_29)'}
        </text>
      </g>

      {/* Y-axis Labels */}
      <text x={padding.left - 8} y={padding.top + 8} textAnchor="end" fill={primaryColor} fontSize="10" fontFamily="monospace">
        {Math.round(maxVal).toLocaleString('fr-FR')}
      </text>
      <text x={padding.left - 8} y={padding.top + plotH / 2 + 4} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
        {Math.round(maxVal / 2).toLocaleString('fr-FR')}
      </text>
      <text x={padding.left - 8} y={padding.top + plotH} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
        0
      </text>
    </svg>
  );
};
