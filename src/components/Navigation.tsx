/**
 * Navigation Bar & Header for UrbanResilience SimLab
 */

import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Box,
  Cpu,
  FileSpreadsheet,
  FolderOpen,
  Layers,
  MapPin,
  Scale,
  Sliders,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { ScenarioId } from '../types/simulation';

export type ActiveTab =
  | 'digitalTwin'
  | 'siteModeling'
  | 'pdfReports'
  | 'dashboard'
  | 'sketchfab'
  | 'comparison'
  | 'spatial'
  | 'licenses'
  | 'replications'
  | 'sensitivity'
  | 'validation'
  | 'importExport'
  | 'documentation';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeScenarioId: ScenarioId;
  onScenarioChange: (id: ScenarioId) => void;
  isSimulating: boolean;
  clockTime: string;
  step: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  activeScenarioId,
  onScenarioChange,
  isSimulating,
  clockTime,
  step,
}) => {
  const tabs = [
    { id: 'digitalTwin' as ActiveTab, label: 'Jumeau Numérique 2D/3D', icon: Box },
    { id: 'siteModeling' as ActiveTab, label: 'Modélisation du Site 2D/3D', icon: MapPin },
    { id: 'pdfReports' as ActiveTab, label: 'Rapports de Simulation', icon: FileSpreadsheet },
    { id: 'sketchfab' as ActiveTab, label: 'Sketchfab & Assets 3D', icon: FolderOpen },
    { id: 'dashboard' as ActiveTab, label: 'Tableau de bord', icon: Activity },
    { id: 'comparison' as ActiveTab, label: 'Comparaison des 5 Scénarios', icon: BarChart3 },
    { id: 'licenses' as ActiveTab, label: 'Sources & Licences', icon: Scale },
    { id: 'replications' as ActiveTab, label: 'Réplications (Mode C)', icon: Layers },
    { id: 'sensitivity' as ActiveTab, label: 'Sensibilité (Mode B)', icon: Sliders },
    { id: 'validation' as ActiveTab, label: 'Validation Scientifique', icon: CheckCircle2 },
    { id: 'importExport' as ActiveTab, label: 'Import & Export', icon: FileSpreadsheet },
    { id: 'documentation' as ActiveTab, label: 'Documentation', icon: BookOpen },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <AppLogo variant="header" onClick={() => onTabChange('digitalTwin')} />

        {/* Status indicator & Scenario Switcher */}
        <div className="flex items-center gap-3 text-xs">
          {/* Live Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isSimulating ? 'bg-emerald-400 ring-2 ring-emerald-500/30' : step >= 540 ? 'bg-sky-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300">
              {isSimulating ? 'Calcul en cours' : step >= 540 ? 'Simulation terminée' : 'Prêt / Pause'}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-200 font-bold">{clockTime}</span>
            <span className="text-slate-500 font-mono">({step}/540)</span>
          </div>

          {/* Quick Scenario Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded border border-slate-700/60">
            <span className="text-slate-400 text-xs px-1 font-medium">Scénario:</span>
            {(['S0', 'S1', 'S2', 'S3', 'S4'] as ScenarioId[]).map((scId) => (
              <button
                key={scId}
                onClick={() => onScenarioChange(scId)}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                  activeScenarioId === scId
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={`Activer ${scId}`}
              >
                {scId}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none border-t border-slate-800/60">
        <nav className="flex space-x-1 py-1.5 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
