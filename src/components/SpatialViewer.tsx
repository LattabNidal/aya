/**
 * Modèle spatial & morphologie urbaine — UV9 Ali Mendjeli, Constantine
 * Les vues 2D (plan masse) et 3D sont celles du modèle urbain
 * "Modèle urbain 3D.html" ; la simulation (agents, rayons de contact,
 * densité, marché, portes) est superposée.
 */

import React, { useState } from 'react';
import { Box, Eye, Flame, TreePine } from 'lucide-react';
import { Agent, ScenarioConfig, SpatialLayout, StepMetric } from '../types/simulation';
import { Orthographic2DView } from './DigitalTwin/Orthographic2DView';
import { SelectedObjectInfo, ThreeUrbanScene } from './DigitalTwin/ThreeUrbanScene';

interface SpatialViewerProps {
  layout: SpatialLayout;
  agents: Agent[];
  config: ScenarioConfig;
  stepMetric: StepMetric | null;
  currentStep: number;
}

export const SpatialViewer: React.FC<SpatialViewerProps> = ({
  layout,
  agents,
  config,
  stepMetric,
  currentStep,
}) => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showProximityLines, setShowProximityLines] = useState<boolean>(true);
  const [showVegetation, setShowVegetation] = useState<boolean>(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedObjectInfo | null>(null);

  const handleSelectObject = (info: SelectedObjectInfo | null) => {
    if (info?.type === 'agent') {
      const id = Number(info.id.replace('agent_', ''));
      setSelectedAgent(agents.find((a) => a.id === id) || null);
      setSelectedElement(null);
    } else {
      setSelectedAgent(null);
      setSelectedElement(info);
    }
  };

  // Identify active contact pairs within 2m threshold
  const contactLines: Array<{ x1: number; y1: number; x2: number; y2: number; isHazardous: boolean }> = [];
  const thresholdSq = config.contamination.contactDistanceThresholdMeters * config.contamination.contactDistanceThresholdMeters;

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy <= thresholdSq) {
        const isHazard = (a.state === 'I' && b.state === 'S') || (a.state === 'S' && b.state === 'I');
        contactLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, isHazardous: isHazard });
      }
    }
  }


  return (
    <div className="space-y-4">
      {/* Top Banner & Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Modèle spatial & Morphologie urbaine</h2>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-emerald-400 font-mono font-medium">UV9 Ali Mendjeli (500m × 400m)</span>
          </div>
          <p className="text-xs text-amber-300/80 font-medium mt-0.5">
            ⚠️ Géométrie illustrative (UV9 Ali Mendjeli) — à remplacer par le plan DAO/SIG du terrain
          </p>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 2D / 3D Toggle */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition ${
                viewMode === '2d' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vue 2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition ${
                viewMode === '3d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Vue 3D
            </button>
          </div>

          {/* Proximity Rays Toggle */}
          <button
            onClick={() => setShowProximityLines(!showProximityLines)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition ${
              showProximityLines
                ? 'bg-amber-950/60 border-amber-600/50 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Afficher les rayons de contact physique (< 2m)"
          >
            Rayons de contact ({contactLines.length})
          </button>

          {/* Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition ${
              showHeatmap
                ? 'bg-rose-950/60 border-rose-600/50 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Densité contacts
          </button>

          {/* Vegetation Toggle */}
          <button
            onClick={() => setShowVegetation(!showVegetation)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition ${
              showVegetation
                ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <TreePine className="w-3.5 h-3.5" />
            Végétation {config.additionalVegetation ? '(S1/S4)' : '(Base)'}
          </button>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: SVG Interactive Plan */}
        <div className="lg:col-span-3 bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-hidden relative shadow-inner">
          <div className="w-full h-[560px] rounded-lg overflow-hidden relative">
            {viewMode === '2d' ? (
              <Orthographic2DView
                layout={layout}
                agents={agents}
                config={config}
                stepMetric={stepMetric}
                measurementMode={false}
                onSelectObject={handleSelectObject}
                showProximityLines={showProximityLines}
                showHeatmapDensity={showHeatmap}
                showTrees={showVegetation}
              />
            ) : (
              <ThreeUrbanScene
                layout={layout}
                agents={agents}
                config={config}
                stepMetric={stepMetric}
                measurementMode={false}
                onSelectObject={handleSelectObject}
                showProximityLines={showProximityLines}
                showHeatmapDensity={showHeatmap}
                showTrees={showVegetation}
              />
            )}
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-xs border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 space-y-1.5 shadow-md">
            <div className="font-semibold text-white text-xs border-b border-slate-800 pb-1">Légende UV9</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span>Susceptible (S)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-ping-slow" />
              <span>Infectieux (I)</span>
            </div>
            {config.epidemicModel === 'SIR' && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>Rétabli (R)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-sky-400 inline-block" />
              <span>Visiteur externe</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" />
              <span>Proximité (&lt; 2m)</span>
            </div>
          </div>
        </div>

        {/* Right: Inspector Panel & Details */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Inspecteur d’éléments
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Cliquez sur un agent ou un bâtiment pour l’analyser.</p>
          </div>

          {/* Selected Agent Details */}
          {selectedAgent ? (
            <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="font-semibold text-white">Agent #{selectedAgent.id}</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                    selectedAgent.state === 'I'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : selectedAgent.state === 'S'
                      ? 'bg-sky-950 text-sky-300 border border-sky-700'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}
                >
                  État {selectedAgent.state}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Position :</span>
                <span className="font-mono text-slate-200">
                  x: {Math.round(selectedAgent.x)}m, y: {Math.round(selectedAgent.y)}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Statut :</span>
                <span className="font-medium text-slate-200">
                  {selectedAgent.isVisitor ? 'Visiteur externe' : 'Résident UV9'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Axe de circulation :</span>
                <span className="font-medium text-indigo-400">{selectedAgent.street}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vitesse :</span>
                <span className="font-mono text-slate-200">
                  {(selectedAgent.speed).toFixed(2)} m/s (~{Math.round(selectedAgent.speed * 3.6)} km/h)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contacts cumulés :</span>
                <span className="font-mono font-semibold text-amber-400">{selectedAgent.cumulativeContacts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Temps de séjour restant :</span>
                <span className="font-mono text-slate-200">{selectedAgent.dwellTimeRemaining} min</span>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="w-full mt-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded transition"
              >
                Fermer la sélection
              </button>
            </div>
          ) : selectedElement ? (
            <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-white border-b border-slate-800 pb-1.5">{selectedElement.name}</div>
              {Object.entries(selectedElement.details).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-slate-400">{k} :</span>
                  <span className="font-mono text-slate-200 text-right">{v}</span>
                </div>
              ))}
              <button
                onClick={() => setSelectedElement(null)}
                className="w-full mt-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded transition"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/40 rounded-lg p-4 border border-slate-800/60 text-slate-400 text-xs space-y-2">
              <p>
                <strong>Structure morphologique de l’UV9 :</strong>
              </p>
              <ul className="space-y-1 list-disc pl-4 text-slate-400">
                <li>
                  <strong className="text-slate-300">Rue A :</strong> Axe commercial piétonnier central (reliant les équipements).
                </li>
                <li>
                  <strong className="text-slate-300">Rue B :</strong> Axe résidentiel transversal nord.
                </li>
                <li>
                  <strong className="text-slate-300">Rue C :</strong> Venelles calmes de liaison piétonne.
                </li>
                <li>
                  <strong className="text-slate-300">Rue D :</strong> Desserte sud et transports en commun.
                </li>
                <li>
                  <strong className="text-slate-300">Marché :</strong> 28 étals de vente informelle créant un goulot de congestion.
                </li>
              </ul>
            </div>
          )}

          {/* Current Instant Stats */}
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/80 text-xs space-y-2">
            <div className="font-semibold text-white border-b border-slate-800 pb-1 flex justify-between">
              <span>Instantané au pas {currentStep}</span>
              <span className="font-mono text-emerald-400">{stepMetric?.clockTime || '09:00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Agents actifs :</span>
              <span className="font-mono text-white">{agents.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Paires en contact direct (&lt;2m) :</span>
              <span className="font-mono font-semibold text-amber-400">{contactLines.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Contacts à risque (S ↔ I) :</span>
              <span className="font-mono font-semibold text-rose-400">
                {contactLines.filter((l) => l.isHazardous).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
