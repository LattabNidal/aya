/**
 * Population & Initial Infection Configuration Panel
 * Allows users to configure:
 * 1. Total population to simulate (e.g. 500 people)
 * 2. Initial infected people (e.g. 10 people)
 * 3. Auto-calculates initial healthy / susceptible people (e.g. 490 people)
 * 4. Verifies coherence automatically (0 <= infected <= total, total >= 10)
 * 5. Provides instant presets and live apply button
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sliders,
  Sparkles,
  Users,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface PopulationConfigPanelProps {
  currentTotalPopulation: number;
  currentInitialInfected: number;
  isSimulating: boolean;
  currentStep: number;
  onApply: (totalPopulation: number, initialInfected: number) => void;
  isCompact?: boolean;
}

export const PopulationConfigPanel: React.FC<PopulationConfigPanelProps> = ({
  currentTotalPopulation,
  currentInitialInfected,
  isSimulating,
  currentStep,
  onApply,
  isCompact = false,
}) => {
  const [totalPop, setTotalPop] = useState<number>(currentTotalPopulation);
  const [infectedCount, setInfectedCount] = useState<number>(currentInitialInfected);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Sync with props when external preset/scenario changes
  useEffect(() => {
    setTotalPop(currentTotalPopulation);
    setInfectedCount(currentInitialInfected);
  }, [currentTotalPopulation, currentInitialInfected]);

  // Coherence calculations
  const healthyCount = Math.max(0, totalPop - infectedCount);
  const infectedPercentage = totalPop > 0 ? ((infectedCount / totalPop) * 100).toFixed(1) : '0';

  // Coherence validation rules
  let validationError: string | null = null;
  if (totalPop < 1) {
    validationError = 'La population minimale doit être d’au moins 1 personne.';
  } else if (infectedCount < 0) {
    validationError = 'Le nombre d’infectés ne peut pas être négatif.';
  } else if (infectedCount > totalPop) {
    validationError = 'Le nombre d’infectés ne peut pas dépasser la population totale.';
  }

  const isCoherent = validationError === null;
  const isChanged = totalPop !== currentTotalPopulation || infectedCount !== currentInitialInfected;

  const handleApply = () => {
    if (!isCoherent) return;
    onApply(totalPop, infectedCount);
  };

  const handlePreset = (pTotal: number, pInfected: number) => {
    setTotalPop(pTotal);
    setInfectedCount(pInfected);
    if (!isSimulating && currentStep === 0) {
      onApply(pTotal, pInfected);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Paramètres de Population & Démarrage Épidémique
              </h3>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.2 rounded font-mono">
                Sans limite d'effectif (ex: 5 000+)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Définissez librement la taille de la population simulée sans aucune restriction arbitraire.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Préréglages :</span>
          <button
            onClick={() => handlePreset(160, 4)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition border ${
              totalPop === 160 && infectedCount === 4
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="160 personnes dont 4 infectées"
          >
            160 (4 inf.)
          </button>
          <button
            onClick={() => handlePreset(500, 10)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition border ${
              totalPop === 500 && infectedCount === 10
                ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="500 personnes dont 10 infectées"
          >
            500 (10 inf.)
          </button>
          <button
            onClick={() => handlePreset(1000, 20)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition border ${
              totalPop === 1000 && infectedCount === 20
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            1 000 (20 inf.)
          </button>
          <button
            onClick={() => handlePreset(2500, 30)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition border ${
              totalPop === 2500 && infectedCount === 30
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            2 500 (30 inf.)
          </button>
          <button
            onClick={() => handlePreset(5000, 50)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition border ${
              totalPop === 5000 && infectedCount === 50
                ? 'bg-amber-600 text-white border-amber-500 font-bold shadow-xs'
                : 'bg-amber-950/80 text-amber-300 border-amber-700/60 hover:bg-amber-900'
            }`}
            title="5 000 personnes dont 50 infectées"
          >
            ⭐ 5 000 (50 inf.)
          </button>
          <button
            onClick={() => handlePreset(10000, 100)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition border ${
              totalPop === 10000 && infectedCount === 100
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            10 000 (100 inf.)
          </button>
        </div>
      </div>

      {/* Sliders & Numeric Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Paramètre 1 : Population Totale */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              1. Population totale simulée :
            </label>
            <div className="flex items-center gap-1.5 font-mono">
              <input
                type="number"
                min="1"
                step="50"
                value={totalPop}
                onChange={(e) => setTotalPop(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-right text-white font-bold focus:border-indigo-500 focus:outline-hidden"
              />
              <span className="text-xs text-slate-400">pers.</span>
            </div>
          </div>

          <input
            type="range"
            min="10"
            max={Math.max(10000, totalPop)}
            step="50"
            value={totalPop}
            onChange={(e) => setTotalPop(parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10 pers.</span>
            <span>2 500 pers.</span>
            <span>5 000 pers.</span>
            <span>10 000+ pers.</span>
          </div>
        </div>

        {/* Paramètre 2 : Personnes Infectées au départ */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              2. Personnes infectées au départ (I₀) :
            </label>
            <div className="flex items-center gap-1.5 font-mono">
              <input
                type="number"
                min="0"
                max={totalPop}
                step="1"
                value={infectedCount}
                onChange={(e) => setInfectedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-right text-rose-400 font-bold focus:border-rose-500 focus:outline-hidden"
              />
              <span className="text-xs text-slate-400">pers.</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={Math.max(1, totalPop)}
            step="1"
            value={infectedCount}
            onChange={(e) => setInfectedCount(parseInt(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 pers.</span>
            <span>{Math.round(totalPop * 0.05)} pers. (~5%)</span>
            <span>{totalPop} pers. (100%)</span>
          </div>
        </div>
      </div>

      {/* Breakdown Badges: Total, Sains, Infectés */}
      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
        {/* Total */}
        <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-slate-400">Population totale :</span>
          <span className="text-white font-bold text-sm">{totalPop} pers.</span>
        </div>

        {/* Sains */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Saines au départ :
          </span>
          <span className="text-emerald-300 font-bold text-sm">
            {healthyCount} pers. ({totalPop > 0 ? ((healthyCount / totalPop) * 100).toFixed(1) : 0}%)
          </span>
        </div>

        {/* Infectées */}
        <div className="bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-rose-400 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Infectées au départ :
          </span>
          <span className="text-rose-300 font-bold text-sm">
            {infectedCount} pers. ({infectedPercentage}%)
          </span>
        </div>
      </div>

      {/* Validation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Coherence Feedback Message */}
        <div className="text-xs">
          {isCoherent ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Cohérence validée : <strong>{totalPop}</strong> personnes simulées (dont <strong>{healthyCount}</strong> saines et <strong>{infectedCount}</strong> infectées).
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="flex items-center gap-2">
          {isSimulating && (
            <span className="text-[11px] text-amber-400 flex items-center gap-1 bg-amber-950/70 border border-amber-800/70 px-2 py-1 rounded">
              ⚠️ Mettre en pause ou réinitialiser pour modifier la population
            </span>
          )}

          <button
            onClick={handleApply}
            disabled={!isCoherent || isSimulating || !isChanged}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg shadow-md transition ring-1 ring-emerald-400/40 disabled:ring-0"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Appliquer & Initialiser la population</span>
          </button>
        </div>
      </div>
    </div>
  );
};
