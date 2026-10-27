/**
 * Sensitivity Analysis Module (Mode B):
 * One-At-A-Time (OAT) parameter variation, response curves,
 * non-linear threshold exploration, and impact assessment.
 */

import React, { useState } from 'react';
import {
  Activity,
  BarChart2,
  CheckCircle,
  Download,
  Info,
  Play,
  RefreshCw,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { SCENARIO_PRESETS } from '../engine/scenarios';
import { runSensitivitySweep } from '../engine/statisticsEngine';
import { SensitivityResult } from '../types/simulation';

export const SensitivityView: React.FC = () => {
  const [results, setResults] = useState<SensitivityResult[]>(() => runSensitivitySweep(SCENARIO_PRESETS.S0));
  const [activeParamIndex, setActiveParamIndex] = useState<number>(0);
  const [isComputing, setIsComputing] = useState<boolean>(false);

  const activeSweep = results[activeParamIndex] || results[0];

  const handleRerun = () => {
    setIsComputing(true);
    setTimeout(() => {
      setResults(runSensitivitySweep(SCENARIO_PRESETS.S0));
      setIsComputing(false);
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <h2 className="text-base font-semibold text-white">Mode B : Analyse de Sensibilité Unidirectionnelle (OAT)</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Étude de l’élasticité des indicateurs : fait varier un seul paramètre à la fois pour isoler son effet marginal.
            </p>
          </div>

          <button
            onClick={handleRerun}
            disabled={isComputing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? 'animate-spin' : ''}`} />
            {isComputing ? 'Balayage en cours...' : 'Réexécuter le balayage'}
          </button>
        </div>

        {/* Parameter Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {results.map((sweep, idx) => (
            <button
              key={sweep.paramKey}
              onClick={() => setActiveParamIndex(idx)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                activeParamIndex === idx
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {sweep.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Sensitivity Curve (Graphique 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Graphique 6 : Courbe de réponse — {activeSweep.label}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{activeSweep.notes}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Contacts finaux
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Infectieux finaux (I)
              </span>
            </div>
          </div>

          <div className="h-64 w-full bg-slate-950/70 rounded-lg p-3 border border-slate-800/80">
            <SensitivityCurveSVG sweep={activeSweep} />
          </div>

          <div className="bg-slate-950/40 p-3 rounded border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Interprétation scientifique :</strong> Observez la pente de la courbe pour détecter les seuils critiques (points de rupture).
              Par exemple, la densification piétonne entraîne souvent une augmentation supra-linéaire des contacts en raison de l’engorgement des goulots d’étranglement de la Rue A.
            </div>
          </div>
        </div>

        {/* Results Values Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
              Données de balayage numérique
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Valeurs discrètes testées</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase">
                <tr>
                  <th className="py-2 px-3 font-sans">Valeur testée</th>
                  <th className="py-2 px-3 text-right">Contacts</th>
                  <th className="py-2 px-3 text-right">Infectés (I)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeSweep.testedValues.map((val, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-sans font-medium text-white">{val}</td>
                    <td className="py-2 px-3 text-right font-bold text-amber-400">
                      {activeSweep.contactsOutcome[idx].toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2 px-3 text-right text-rose-400">
                      {activeSweep.infectedOutcome[idx]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Sensitivity curve SVG
 */
const SensitivityCurveSVG: React.FC<{ sweep: SensitivityResult }> = ({ sweep }) => {
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 35, bottom: 35, left: 55 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const n = sweep.testedValues.length;
  if (n < 2) return null;

  const maxContacts = Math.max(...sweep.contactsOutcome, 10);
  const maxInfected = Math.max(...sweep.infectedOutcome, 10);

  const getX = (i: number) => padding.left + (i / (n - 1)) * plotW;
  const getYContacts = (val: number) => padding.top + plotH - (val / (maxContacts || 1)) * plotH;
  const getYInfected = (val: number) => padding.top + plotH - (val / (maxInfected || 1)) * plotH;

  const contactsPath = sweep.contactsOutcome
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYContacts(c).toFixed(1)}`)
    .join(' ');

  const infectedPath = sweep.infectedOutcome
    .map((inf, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYInfected(inf).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
      {/* Grid lines */}
      <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#334155" strokeDasharray="3 3" />
      <line x1={padding.left} y1={padding.top + plotH / 2} x2={width - padding.right} y2={padding.top + plotH / 2} stroke="#334155" strokeDasharray="3 3" />
      <line x1={padding.left} y1={padding.top + plotH} x2={width - padding.right} y2={padding.top + plotH} stroke="#475569" />

      {/* Curves */}
      <path d={contactsPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      <path d={infectedPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />

      {/* Data points */}
      {sweep.testedValues.map((val, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getYContacts(sweep.contactsOutcome[i])} r="4" fill="#f59e0b" />
          <circle cx={getX(i)} cy={getYInfected(sweep.infectedOutcome[i])} r="3.5" fill="#f43f5e" />
          {/* X-axis tick label */}
          <text x={getX(i)} y={padding.top + plotH + 16} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
            {val}
          </text>
        </g>
      ))}

      {/* Y-axis Labels */}
      <text x={padding.left - 8} y={padding.top + 8} textAnchor="end" fill="#f59e0b" fontSize="10" fontFamily="monospace">
        {maxContacts.toLocaleString('fr-FR')}
      </text>
      <text x={padding.left - 8} y={padding.top + plotH / 2 + 4} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
        {Math.round(maxContacts / 2).toLocaleString('fr-FR')}
      </text>
      <text x={padding.left - 8} y={padding.top + plotH} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
        0
      </text>

      {/* Right Y-axis for Infections */}
      <text x={width - padding.right + 6} y={padding.top + 8} textAnchor="start" fill="#f43f5e" fontSize="10" fontFamily="monospace">
        {maxInfected} I
      </text>
    </svg>
  );
};
