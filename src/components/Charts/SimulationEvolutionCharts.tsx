/**
 * Simulation Evolution Charts Component
 * Real-time synchronized graphs for OCCSIM / UrbanResilience SimLab:
 *
 * Graphique 1 : Dynamique de la Population
 * - Nombre de personnes saines (Vert #22c55e)
 * - Nombre de personnes infectées (Rouge #ef4444)
 * - Nombre de personnes rétablies / exposées (Jaune #eab308, si SIR)
 * - Évolution au cours du temps (09:00 -> 18:00)
 *
 * Graphique 2 : Dynamique des Infections
 * - Nombre de personnes infectées actives (Rouge #ef4444)
 * - Nombre de nouvelles infections par pas (Orange #f97316)
 * - Évolution pendant la simulation
 */

import React, { useState } from 'react';
import { Activity, AlertTriangle, BarChart3, TrendingUp, Users } from 'lucide-react';
import { StepMetric } from '../../types/simulation';

interface SimulationEvolutionChartsProps {
  metrics: StepMetric[];
  currentStep: number;
  initialPopulation: number;
  initialInfectedCount: number;
  isCompact?: boolean;
}

export const SimulationEvolutionCharts: React.FC<SimulationEvolutionChartsProps> = ({
  metrics,
  currentStep,
  initialPopulation,
  initialInfectedCount,
  isCompact = false,
}) => {
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);

  // Fallback initial point if simulation hasn't stepped yet
  const effectiveMetrics: StepMetric[] =
    metrics.length > 0
      ? metrics
      : [
          {
            step: 0,
            simulatedMinutes: 0,
            clockTime: '09:00',
            populationPresent: initialPopulation,
            susceptibleCount: initialPopulation - initialInfectedCount,
            infectiousCount: initialInfectedCount,
            removedCount: 0,
            infectiousPercentage: Number(((initialInfectedCount / initialPopulation) * 100).toFixed(1)),
            proximityContacts: 0,
            uniquePairsInContact: 0,
            contactEpisodes: 0,
            cumulativeContacts: 0,
            newInfections: 0,
            temperature: 32.5,
            relativeHumidity: 50,
            windSpeed: 3.2,
            visitorsPresent: 0,
            streetFlows: { RueA: 0, RueB: 0, RueC: 0, RueD: 0 },
          },
        ];

  const lastMetric = effectiveMetrics[effectiveMetrics.length - 1];
  const hoveredMetric =
    hoveredStepIndex !== null && effectiveMetrics[hoveredStepIndex]
      ? effectiveMetrics[hoveredStepIndex]
      : lastMetric;

  // Chart Dimensions
  const svgWidth = isCompact ? 500 : 640;
  const svgHeight = isCompact ? 180 : 220;
  const padding = { top: 16, right: 20, bottom: 28, left: 45 };
  const plotW = svgWidth - padding.left - padding.right;
  const plotH = svgHeight - padding.top - padding.bottom;

  // Downsample if more than 180 points for butter-smooth SVG rendering
  const stride = Math.max(1, Math.floor(effectiveMetrics.length / 180));
  const sampledMetrics = effectiveMetrics.filter(
    (_, idx) => idx % stride === 0 || idx === effectiveMetrics.length - 1
  );

  // Maximum scales
  const maxPop = Math.max(
    initialPopulation * 1.15,
    ...effectiveMetrics.map((m) => m.populationPresent),
    ...effectiveMetrics.map((m) => m.susceptibleCount + m.infectiousCount + m.removedCount),
    50
  );

  const maxInfected = Math.max(
    initialInfectedCount * 1.5,
    ...effectiveMetrics.map((m) => m.infectiousCount),
    10
  );

  const maxNewInfections = Math.max(
    ...effectiveMetrics.map((m) => m.newInfections || 0),
    4
  );

  // Coordinates calculators
  const getX = (step: number) => padding.left + (Math.max(0, Math.min(540, step)) / 540) * plotW;
  const getYPop = (val: number) => padding.top + plotH - (Math.max(0, val) / maxPop) * plotH;
  const getYInfected = (val: number) => padding.top + plotH - (Math.max(0, val) / maxInfected) * plotH;
  const getYNewInfections = (val: number) => padding.top + plotH - (Math.max(0, val) / maxNewInfections) * plotH;

  // Graphique 1 Paths (Population Saines & Infectées)
  const pathSaines = sampledMetrics
    .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(m.step).toFixed(1)} ${getYPop(m.susceptibleCount).toFixed(1)}`)
    .join(' ');

  const pathInfecteesPop = sampledMetrics
    .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(m.step).toFixed(1)} ${getYPop(m.infectiousCount).toFixed(1)}`)
    .join(' ');

  const areaSaines = `${pathSaines} L ${getX(sampledMetrics[sampledMetrics.length - 1].step).toFixed(1)} ${padding.top + plotH} L ${getX(sampledMetrics[0].step).toFixed(1)} ${padding.top + plotH} Z`;

  // Graphique 2 Paths (Infections actives & Nouvelles infections)
  const pathInfecteesActive = sampledMetrics
    .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(m.step).toFixed(1)} ${getYInfected(m.infectiousCount).toFixed(1)}`)
    .join(' ');

  const areaInfecteesActive = `${pathInfecteesActive} L ${getX(sampledMetrics[sampledMetrics.length - 1].step).toFixed(1)} ${padding.top + plotH} L ${getX(sampledMetrics[0].step).toFixed(1)} ${padding.top + plotH} Z`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* =========================================================================
          GRAPHIQUE 1 : Évolution de la Population (Personnes Saines vs Infectées)
         ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Graphique 1 : Évolution de la Population
              </h3>
              <p className="text-[11px] text-slate-400">
                Personnes Saines (Vert) vs Personnes Infectées (Rouge) au cours du temps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Saines: {hoveredMetric.susceptibleCount}
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Infectées: {hoveredMetric.infectiousCount}
            </span>
          </div>
        </div>

        {/* SVG Graphique 1 */}
        <div className="relative w-full bg-slate-950/70 rounded-lg p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
            <defs>
              <linearGradient id="gradSaines" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={padding.left} y1={padding.top} x2={svgWidth - padding.right} y2={padding.top} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH * 0.25} x2={svgWidth - padding.right} y2={padding.top + plotH * 0.25} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH * 0.5} x2={svgWidth - padding.right} y2={padding.top + plotH * 0.5} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH * 0.75} x2={svgWidth - padding.right} y2={padding.top + plotH * 0.75} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH} x2={svgWidth - padding.right} y2={padding.top + plotH} stroke="#334155" />

            {/* Vertical Milestones lines (09h, 13h, 18h) */}
            <line x1={getX(0)} y1={padding.top} x2={getX(0)} y2={padding.top + plotH} stroke="#334155" strokeDasharray="2 2" />
            <line x1={getX(240)} y1={padding.top} x2={getX(240)} y2={padding.top + plotH} stroke="#334155" strokeDasharray="2 2" />
            <line x1={getX(540)} y1={padding.top} x2={getX(540)} y2={padding.top + plotH} stroke="#334155" strokeDasharray="2 2" />

            {/* Area Fill for Saines */}
            <path d={areaSaines} fill="url(#gradSaines)" />

            {/* Saines Curve (Vert) */}
            <path d={pathSaines} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Infectées Curve (Rouge) */}
            <path d={pathInfecteesPop} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Current step pointer dot */}
            {sampledMetrics.length > 0 && (
              <>
                <circle
                  cx={getX(lastMetric.step)}
                  cy={getYPop(lastMetric.susceptibleCount)}
                  r="4.5"
                  fill="#22c55e"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <circle
                  cx={getX(lastMetric.step)}
                  cy={getYPop(lastMetric.infectiousCount)}
                  r="4.5"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </>
            )}

            {/* Y-axis Labels */}
            <text x={padding.left - 6} y={padding.top + 8} textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              {Math.round(maxPop)}
            </text>
            <text x={padding.left - 6} y={padding.top + plotH * 0.5 + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
              {Math.round(maxPop / 2)}
            </text>
            <text x={padding.left - 6} y={padding.top + plotH} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
              0
            </text>

            {/* X-axis Labels */}
            <text x={getX(0)} y={svgHeight - 10} textAnchor="start" fill="#64748b" fontSize="9" fontFamily="monospace">
              09:00
            </text>
            <text x={getX(240)} y={svgHeight - 10} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
              13:00 (Midi)
            </text>
            <text x={getX(540)} y={svgHeight - 10} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
              18:00
            </text>
          </svg>
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 mt-2 font-mono">
          <span>Population totale: <strong className="text-white">{lastMetric.populationPresent}</strong></span>
          <span className="text-emerald-400">Saines: <strong>{lastMetric.susceptibleCount}</strong> ({((lastMetric.susceptibleCount / Math.max(1, lastMetric.populationPresent)) * 100).toFixed(1)}%)</span>
          <span className="text-rose-400">Infectées: <strong>{lastMetric.infectiousCount}</strong> ({lastMetric.infectiousPercentage}%)</span>
        </div>
      </div>

      {/* =========================================================================
          GRAPHIQUE 2 : Évolution des Infections & Nouvelles Infections
         ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-950 border border-rose-700/60 text-rose-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Graphique 2 : Dynamique des Infections
              </h3>
              <p className="text-[11px] text-slate-400">
                Infectés cumulés actifs (Rouge) & Nouvelles infections (Orange)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Infectés: {hoveredMetric.infectiousCount}
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-2.5 h-1 bg-amber-400 rounded inline-block" />
              Nouveaux: +{hoveredMetric.newInfections || 0}
            </span>
          </div>
        </div>

        {/* SVG Graphique 2 */}
        <div className="relative w-full bg-slate-950/70 rounded-lg p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
            <defs>
              <linearGradient id="gradInfectees" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={padding.left} y1={padding.top} x2={svgWidth - padding.right} y2={padding.top} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH * 0.25} x2={svgWidth - padding.right} y2={padding.top + plotH * 0.25} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH * 0.5} x2={svgWidth - padding.right} y2={padding.top + plotH * 0.5} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH * 0.75} x2={svgWidth - padding.right} y2={padding.top + plotH * 0.75} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={padding.top + plotH} x2={svgWidth - padding.right} y2={padding.top + plotH} stroke="#334155" />

            {/* Vertical Milestones */}
            <line x1={getX(0)} y1={padding.top} x2={getX(0)} y2={padding.top + plotH} stroke="#334155" strokeDasharray="2 2" />
            <line x1={getX(240)} y1={padding.top} x2={getX(240)} y2={padding.top + plotH} stroke="#334155" strokeDasharray="2 2" />
            <line x1={getX(540)} y1={padding.top} x2={getX(540)} y2={padding.top + plotH} stroke="#334155" strokeDasharray="2 2" />

            {/* New infections impulse bars */}
            {sampledMetrics.map((m) => {
              if (!m.newInfections || m.newInfections <= 0) return null;
              const barH = (m.newInfections / maxNewInfections) * (plotH * 0.45);
              return (
                <rect
                  key={`new_${m.step}`}
                  x={getX(m.step) - 1.5}
                  y={padding.top + plotH - barH}
                  width="3"
                  height={barH}
                  fill="#f59e0b"
                  opacity="0.75"
                />
              );
            })}

            {/* Area Fill for Infectees */}
            <path d={areaInfecteesActive} fill="url(#gradInfectees)" />

            {/* Infectées Curve (Rouge) */}
            <path d={pathInfecteesActive} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Current point dot */}
            {sampledMetrics.length > 0 && (
              <circle
                cx={getX(lastMetric.step)}
                cy={getYInfected(lastMetric.infectiousCount)}
                r="4.5"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}

            {/* Y-axis Labels for Total Infected */}
            <text x={padding.left - 6} y={padding.top + 8} textAnchor="end" fill="#ef4444" fontSize="9" fontFamily="monospace">
              {Math.round(maxInfected)}
            </text>
            <text x={padding.left - 6} y={padding.top + plotH * 0.5 + 3} textAnchor="end" fill="#ef4444" opacity="0.7" fontSize="8" fontFamily="monospace">
              {Math.round(maxInfected / 2)}
            </text>
            <text x={padding.left - 6} y={padding.top + plotH} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
              0
            </text>

            {/* Secondary Y-axis for New Infections */}
            <text x={svgWidth - padding.right + 6} y={padding.top + 8} textAnchor="start" fill="#f59e0b" fontSize="9" fontFamily="monospace">
              +{maxNewInfections}
            </text>
            <text x={svgWidth - padding.right + 6} y={padding.top + plotH} textAnchor="start" fill="#64748b" fontSize="8" fontFamily="monospace">
              +0
            </text>

            {/* X-axis Labels */}
            <text x={getX(0)} y={svgHeight - 10} textAnchor="start" fill="#64748b" fontSize="9" fontFamily="monospace">
              09:00
            </text>
            <text x={getX(240)} y={svgHeight - 10} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
              13:00 (Midi)
            </text>
            <text x={getX(540)} y={svgHeight - 10} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
              18:00
            </text>
          </svg>
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 mt-2 font-mono">
          <span>Infectés initiaux (I₀): <strong className="text-slate-200">{initialInfectedCount}</strong></span>
          <span className="text-amber-400">Nouvelles infections cumulées: <strong>+{Math.max(0, lastMetric.infectiousCount - initialInfectedCount)}</strong></span>
          <span className="text-rose-400">Pic épidémique: <strong>{Math.max(...effectiveMetrics.map((m) => m.infectiousCount))}</strong></span>
        </div>
      </div>
    </div>
  );
};
