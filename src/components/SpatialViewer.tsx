/**
 * Spatial Model & 3D Isometric Viewer:
 * Unité de Voisinage 9 (UV9) Ali Mendjeli, Constantine
 * Interactive 2D schematic SVG with real-time agent dots, proximity rays,
 * contact density heatmap overlay, and 2.5D isometric view toggle.
 */

import React, { useState } from 'react';
import {
  Box,
  Eye,
  Flame,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  TreePine,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Agent, Building, ScenarioConfig, SpatialLayout, StepMetric } from '../types/simulation';

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
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

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

  // Active market position
  const marketPos = config.marketRelocated ? config.marketPosition : { x: layout.market.x, y: layout.market.y };

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
              Vue 3D Isométrique
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

          {/* Zoom buttons */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded border border-slate-700">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-slate-300 font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: SVG Interactive Plan */}
        <div className="lg:col-span-3 bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-hidden relative shadow-inner">
          <div
            className="w-full flex items-center justify-center transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            {viewMode === '2d' ? (
              <SVG2DPlan
                layout={layout}
                agents={agents}
                config={config}
                marketPos={marketPos}
                contactLines={contactLines}
                showProximityLines={showProximityLines}
                showHeatmap={showHeatmap}
                showVegetation={showVegetation}
                selectedAgent={selectedAgent}
                onSelectAgent={setSelectedAgent}
                selectedBuilding={selectedBuilding}
                onSelectBuilding={setSelectedBuilding}
              />
            ) : (
              <SVG3DIsometricPlan
                layout={layout}
                agents={agents}
                config={config}
                marketPos={marketPos}
                contactLines={contactLines}
                showVegetation={showVegetation}
                selectedAgent={selectedAgent}
                onSelectAgent={setSelectedAgent}
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
          ) : selectedBuilding ? (
            <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-white border-b border-slate-800 pb-1.5">{selectedBuilding.name}</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Typologie :</span>
                <span className="text-slate-200 font-medium">Habitat collectif ({selectedBuilding.floors} étages)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Emprise au sol :</span>
                <span className="font-mono text-slate-200">
                  {selectedBuilding.width}m × {selectedBuilding.height}m ({selectedBuilding.width * selectedBuilding.height} m²)
                </span>
              </div>
              <p className="text-slate-400 text-xs italic mt-2">
                Les agents contournent cet obstacle géométrique pour éviter toute traversée irréaliste de bâtiment.
              </p>
              <button
                onClick={() => setSelectedBuilding(null)}
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

/**
 * 2D Interactive SVG plan of UV9
 */
const SVG2DPlan: React.FC<{
  layout: SpatialLayout;
  agents: Agent[];
  config: ScenarioConfig;
  marketPos: { x: number; y: number };
  contactLines: Array<{ x1: number; y1: number; x2: number; y2: number; isHazardous: boolean }>;
  showProximityLines: boolean;
  showHeatmap: boolean;
  showVegetation: boolean;
  selectedAgent: Agent | null;
  onSelectAgent: (a: Agent) => void;
  selectedBuilding: Building | null;
  onSelectBuilding: (b: Building) => void;
}> = ({
  layout,
  agents,
  config,
  marketPos,
  contactLines,
  showProximityLines,
  showHeatmap,
  showVegetation,
  selectedAgent,
  onSelectAgent,
  selectedBuilding,
  onSelectBuilding,
}) => {
  return (
    <svg viewBox="0 0 500 400" className="w-full max-w-[850px] aspect-5/4 select-none">
      <defs>
        {/* Street corridor gradient */}
        <pattern id="groundGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
        {/* Heatmap blur filter */}
        <filter id="heatBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Ground Background & Site Plan Calque */}
      <rect x="0" y="0" width="500" height="400" fill="#090d16" />
      <rect x="0" y="0" width="500" height="400" fill="url(#groundGrid)" />

      {layout.referencePlanUrl && (
        <image
          href={layout.referencePlanUrl}
          x="0"
          y="0"
          width="500"
          height="400"
          preserveAspectRatio="none"
          opacity="0.35"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 1. Urban Blocks / Îlots (Cadastral superblocks) */}
      {layout.blocks?.map((blk) => {
        const pointsStr = blk.polygon.map((p) => `${p.x},${p.y}`).join(' ');
        const labelX = blk.labelPoint?.x || blk.polygon[0].x;
        const labelY = blk.labelPoint?.y || blk.polygon[0].y;
        return (
          <g key={blk.id}>
            <polygon
              points={pointsStr}
              fill={blk.color || '#3b82f6'}
              fillOpacity="0.10"
              stroke={blk.color || '#60a5fa'}
              strokeWidth="1.6"
              strokeDasharray="6,4"
            />
            <g transform={`translate(${labelX}, ${labelY})`}>
              <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#0f172a" fillOpacity="0.8" stroke={blk.color || '#60a5fa'} strokeWidth="0.8" />
              <text x="0" y="2" textAnchor="middle" dominantBaseline="middle" fill="#e2e8f0" fontSize="6.5" fontWeight="bold">
                {blk.code}
              </text>
            </g>
          </g>
        );
      })}

      {/* 2. Streets (Boulevards) */}
      {layout.streets.map((st) => {
        const pathD = st.path.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
        return (
          <g key={st.id}>
            <path d={pathD} fill="none" stroke="#1e293b" strokeWidth={st.width} strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="6,4" opacity="0.7" />
            <text
              x={st.path[Math.floor(st.path.length / 2)].x + 4}
              y={st.path[Math.floor(st.path.length / 2)].y - 4}
              fill="#94a3b8"
              fontSize="7"
              fontWeight="bold"
            >
              {st.code}
            </text>
          </g>
        );
      })}

      {/* 3. Pedestrian Alleys & Ruelles (Ruelles piétonnes en U, venelles) */}
      {layout.ruelles?.map((ruelle) => {
        const pathD = ruelle.path.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
        return (
          <g key={ruelle.id}>
            <path d={pathD} fill="none" stroke="#cbd5e1" strokeWidth={ruelle.width} strokeLinecap="round" opacity="0.5" />
            <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" opacity="0.8" />
          </g>
        );
      })}

      {/* Vegetation Zones */}
      {showVegetation &&
        layout.vegetationZones.map((veg) => {
          if (veg.addedInScenario && !veg.addedInScenario.includes(config.id)) {
            return null;
          }
          const isAddedInS1 = veg.addedInScenario?.includes('S1');
          return (
            <g key={veg.id}>
              <rect
                x={veg.x}
                y={veg.y}
                width={veg.width}
                height={veg.height}
                fill={isAddedInS1 ? '#065f46' : '#047857'}
                opacity={isAddedInS1 ? '0.45' : '0.35'}
                rx="4"
                stroke={isAddedInS1 ? '#10b981' : '#059669'}
                strokeWidth="1"
                strokeDasharray={isAddedInS1 ? '3 2' : 'none'}
              />
              <text x={veg.x + veg.width / 2} y={veg.y + veg.height / 2} fill="#6ee7b7" fontSize="5.5" textAnchor="middle">
                🌳 {veg.name}
              </text>
            </g>
          );
        })}

      {/* Market Zone */}
      <g>
        <rect
          x={marketPos.x}
          y={marketPos.y}
          width={layout.market.width}
          height={layout.market.height}
          fill={config.marketRelocated ? '#047857' : '#991b1b'}
          opacity="0.35"
          rx="4"
          stroke={config.marketRelocated ? '#10b981' : '#ef4444'}
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <text
          x={marketPos.x + layout.market.width / 2}
          y={marketPos.y + layout.market.height / 2 - 4}
          fill={config.marketRelocated ? '#6ee7b7' : '#fca5a5'}
          fontSize="6.5"
          fontWeight="bold"
          textAnchor="middle"
        >
          {config.marketRelocated ? '🛍️ Marché Déplacé (S3/S4)' : '🛒 Marché Informel (28 étals)'}
        </text>
        <text
          x={marketPos.x + layout.market.width / 2}
          y={marketPos.y + layout.market.height / 2 + 6}
          fill="#94a3b8"
          fontSize="5"
          textAnchor="middle"
        >
          {config.marketRelocated ? 'Esplanade aérée Rue D' : 'Goulot d’étranglement Rue A'}
        </text>
      </g>

      {/* Buildings (Habitat Collectif Blocks & Equipments with Rotation & Typology) */}
      {layout.buildings.map((b) => {
        const isSelected = selectedBuilding?.id === b.id;
        const isMosque = b.id.includes('mosque') || b.name.toLowerCase().includes('mosquée');
        const isSchool = b.id.includes('ecole') || b.name.toLowerCase().includes('école');
        const isHotel = b.id.includes('hotel') || b.name.toLowerCase().includes('hôtel');
        const isCem = b.id.includes('cem') || b.name.toLowerCase().includes('cem');
        const isComm = b.id.includes('comm') || b.name.toLowerCase().includes('commercial');

        let fillCol = isSelected ? '#334155' : '#1e293b';
        let strokeCol = isSelected ? '#38bdf8' : '#475569';

        if (isMosque) {
          fillCol = isSelected ? '#065f46' : '#047857';
          strokeCol = '#34d399';
        } else if (isSchool) {
          fillCol = isSelected ? '#854d0e' : '#713f12';
          strokeCol = '#fbbf24';
        } else if (isHotel) {
          fillCol = isSelected ? '#1e3a8a' : '#172554';
          strokeCol = '#60a5fa';
        } else if (isCem) {
          fillCol = isSelected ? '#991b1b' : '#7f1d1d';
          strokeCol = '#f87171';
        } else if (isComm) {
          fillCol = isSelected ? '#0369a1' : '#075985';
          strokeCol = '#38bdf8';
        }

        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;

        return (
          <g
            key={b.id}
            transform={b.rotation ? `rotate(${b.rotation}, ${cx}, ${cy})` : undefined}
            onClick={() => onSelectBuilding(b)}
            className="cursor-pointer"
          >
            {/* Building Shadow */}
            <rect x={b.x + 3} y={b.y + 4} width={b.width} height={b.height} fill="#020617" opacity="0.7" rx="3" />
            {/* Building Footprint */}
            <rect
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              fill={fillCol}
              stroke={strokeCol}
              strokeWidth={isSelected ? '2' : '1'}
              rx="3"
            />
            {/* Architectural details */}
            {isMosque ? (
              <circle cx={cx} cy={cy} r={Math.min(5, b.width * 0.2)} fill="#34d399" opacity="0.6" />
            ) : (
              <line x1={b.x} y1={cy} x2={b.x + b.width} y2={cy} stroke={strokeCol} strokeWidth="0.5" opacity="0.5" />
            )}
            {/* Label */}
            <text x={cx} y={cy + 2} fill="#e2e8f0" fontSize="5" fontWeight="medium" textAnchor="middle">
              {b.name.length > 20 ? `${b.name.slice(0, 18)}...` : b.name}
            </text>
          </g>
        );
      })}

      {/* Visitor Entrance Gates */}
      {layout.visitorGates.map((gate) => (
        <g key={gate.id}>
          <circle cx={gate.position.x} cy={gate.position.y} r="5" fill="#f59e0b" opacity="0.8" />
          <text
            x={gate.position.x + (gate.position.x > 400 ? -8 : gate.position.x < 100 ? 8 : 0)}
            y={gate.position.y + (gate.position.y > 300 ? -8 : 12)}
            fill="#fbbf24"
            fontSize="6"
            fontWeight="bold"
            textAnchor="middle"
          >
            🚪 {gate.name}
          </text>
        </g>
      ))}

      {/* Heatmap Overlay (if enabled) */}
      {showHeatmap && (
        <g filter="url(#heatBlur)" opacity="0.6">
          {agents.map((a, idx) => (
            <circle key={`heat_${idx}`} cx={a.x} cy={a.y} r={a.state === 'I' ? '14' : '9'} fill={a.state === 'I' ? '#f43f5e' : '#f59e0b'} />
          ))}
        </g>
      )}

      {/* Proximity Rays (< 2m threshold) */}
      {showProximityLines &&
        contactLines.map((line, idx) => (
          <line
            key={`line_${idx}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.isHazardous ? '#f43f5e' : '#f59e0b'}
            strokeWidth={line.isHazardous ? '1.8' : '1.2'}
            strokeOpacity="0.85"
            strokeDasharray={line.isHazardous ? '2 1' : 'none'}
          />
        ))}

      {/* Pedestrian Agents */}
      {agents.map((agent) => {
        const isSelected = selectedAgent?.id === agent.id;
        const color = agent.state === 'I' ? '#f43f5e' : agent.state === 'R' ? '#10b981' : '#38bdf8';

        return (
          <g key={agent.id} onClick={() => onSelectAgent(agent)} className="cursor-pointer">
            {/* Outer halo for infectious or selected */}
            {(agent.state === 'I' || isSelected) && (
              <circle cx={agent.x} cy={agent.y} r={isSelected ? '6.5' : '4.5'} fill={color} opacity="0.3" />
            )}
            {/* Agent Body Dot */}
            <circle
              cx={agent.x}
              cy={agent.y}
              r={agent.isVisitor ? '2.8' : '2.4'}
              fill={color}
              stroke={agent.isVisitor ? '#f59e0b' : '#0f172a'}
              strokeWidth={agent.isVisitor ? '1' : '0.5'}
            />
          </g>
        );
      })}
    </svg>
  );
};

/**
 * 2.5D Isometric SVG Plan
 */
const SVG3DIsometricPlan: React.FC<{
  layout: SpatialLayout;
  agents: Agent[];
  config: ScenarioConfig;
  marketPos: { x: number; y: number };
  contactLines: Array<{ x1: number; y1: number; x2: number; y2: number; isHazardous: boolean }>;
  showVegetation: boolean;
  selectedAgent: Agent | null;
  onSelectAgent: (a: Agent) => void;
}> = ({ layout, agents, config, marketPos, contactLines, showVegetation, selectedAgent, onSelectAgent }) => {
  // Simple isometric projection math:
  // isoX = (x - y) * cos(30°)
  // isoY = (x + y) * sin(30°) - z
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  const toIso = (x: number, y: number, z: number = 0) => {
    // Center around map midpoint (250, 200)
    const cx = x - 250;
    const cy = y - 200;
    const isoX = 400 + (cx - cy) * cos30 * 0.9;
    const isoY = 250 + (cx + cy) * sin30 * 0.9 - z;
    return { x: isoX, y: isoY };
  };

  return (
    <svg viewBox="0 0 800 500" className="w-full max-w-[850px] aspect-8/5 select-none">
      <rect x="0" y="0" width="800" height="500" fill="#090d16" />

      {/* Ground plane */}
      {(() => {
        const p1 = toIso(0, 0, 0);
        const p2 = toIso(500, 0, 0);
        const p3 = toIso(500, 400, 0);
        const p4 = toIso(0, 400, 0);
        return (
          <polygon
            points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1"
          />
        );
      })()}

      {/* Extruded 3D Buildings */}
      {layout.buildings.map((b) => {
        const heightZ = b.floors * 4.5;
        const b1 = toIso(b.x, b.y, 0);
        const b2 = toIso(b.x + b.width, b.y, 0);
        const b3 = toIso(b.x + b.width, b.y + b.height, 0);
        const b4 = toIso(b.x, b.y + b.height, 0);

        const t1 = toIso(b.x, b.y, heightZ);
        const t2 = toIso(b.x + b.width, b.y, heightZ);
        const t3 = toIso(b.x + b.width, b.y + b.height, heightZ);
        const t4 = toIso(b.x, b.y + b.height, heightZ);

        return (
          <g key={`3d_${b.id}`}>
            {/* South Side Facade */}
            <polygon
              points={`${b4.x},${b4.y} ${b3.x},${b3.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`}
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="0.5"
            />
            {/* East Side Facade */}
            <polygon
              points={`${b3.x},${b3.y} ${b2.x},${b2.y} ${t2.x},${t2.y} ${t3.x},${t3.y}`}
              fill="#334155"
              stroke="#475569"
              strokeWidth="0.5"
            />
            {/* Roof Top */}
            <polygon
              points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`}
              fill="#475569"
              stroke="#64748b"
              strokeWidth="1"
            />
            <text x={t3.x - 10} y={t3.y - 4} fill="#94a3b8" fontSize="6" textAnchor="middle">
              {b.name.split('(')[0]} (R+{b.floors})
            </text>
          </g>
        );
      })}

      {/* 3D Agents */}
      {agents.map((a) => {
        const pos = toIso(a.x, a.y, 2);
        const color = a.state === 'I' ? '#f43f5e' : a.state === 'R' ? '#10b981' : '#38bdf8';
        return (
          <g key={`3d_agent_${a.id}`} onClick={() => onSelectAgent(a)} className="cursor-pointer">
            {/* Ground shadow */}
            {(() => {
              const groundPos = toIso(a.x, a.y, 0);
              return <ellipse cx={groundPos.x} cy={groundPos.y} rx="2" ry="1" fill="#000" opacity="0.5" />;
            })()}
            <circle cx={pos.x} cy={pos.y} r="2.5" fill={color} stroke="#fff" strokeWidth="0.5" />
          </g>
        );
      })}
    </svg>
  );
};
