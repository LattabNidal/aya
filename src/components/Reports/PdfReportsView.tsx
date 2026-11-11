/**
 * Scientific PDF Reports & History Hub
 * Allows users to preview, generate, download, print A4 scientific PDF reports,
 * export CSV/XLSX tables, and manage report history.
 */

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AppLogo } from '../AppLogo';
import {
  generateScientificPdfReport,
  ReportMetadata,
} from '../../services/pdfReportGenerator';
import { exportScenarioSummaryToExcel, generateSimulationCSV } from '../../engine/exportImport';
import { ScenarioConfig, ScenarioReplicationStats, SimulationResult, StepMetric } from '../../types/simulation';

interface PdfReportsViewProps {
  config: ScenarioConfig;
  metrics: StepMetric[];
  result: SimulationResult | null;
  replicationsStats?: ScenarioReplicationStats[];
}

export const PdfReportsView: React.FC<PdfReportsViewProps> = ({
  config,
  metrics,
  result,
  replicationsStats = [],
}) => {
  const [reportHistory, setReportHistory] = useState<ReportMetadata[]>(() => {
    const saved = localStorage.getItem('urban_reports_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        id: `REP_S0_${Date.now().toString().slice(-4)}`,
        title: 'Rapport Scientifique — Scénario S0 (État Existant)',
        createdAt: new Date().toLocaleString('fr-FR'),
        scenarioId: 'S0',
        replicationsCount: 30,
        author: 'UrbanResilience SimLab Engine',
        status: 'Généré',
      },
    ];
  });

  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('urban_reports_history', JSON.stringify(reportHistory));
  }, [reportHistory]);

  // Load logo as Data URL for PDF embedding
  const loadLogoAsDataUrl = async (): Promise<string | undefined> => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}images/urbanresilience-logo.png`);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  };

  // Generate new PDF Report
  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const logoDataUrl = await loadLogoAsDataUrl();
      const { pdf, dataUrl } = await generateScientificPdfReport({
        config,
        metrics,
        result,
        replicationsStats,
        logoDataUrl,
      });

      const newRepId = `REP_${config.id}_${Date.now().toString().slice(-5)}`;
      const newMeta: ReportMetadata = {
        id: newRepId,
        title: `Rapport Scientifique — Scénario ${config.id} (${config.name})`,
        createdAt: new Date().toLocaleString('fr-FR'),
        scenarioId: config.id,
        replicationsCount: replicationsStats.length || 1,
        author: 'UrbanResilience SimLab Engine v2.4',
        status: 'Généré',
        pdfDataUrl: dataUrl,
      };

      setReportHistory([newMeta, ...reportHistory]);
      setActivePdfUrl(dataUrl);
      setSelectedReportId(newRepId);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download PDF file directly
  const handleDownloadPdf = async () => {
    const logoDataUrl = await loadLogoAsDataUrl();
    const { pdf } = await generateScientificPdfReport({
      config,
      metrics,
      result,
      replicationsStats,
      logoDataUrl,
    });
    pdf.save(`UrbanResilience_Rapport_${config.id}_${Date.now().toString().slice(-6)}.pdf`);
  };

  // Print PDF
  const handlePrintPdf = () => {
    if (activePdfUrl) {
      const win = window.open(activePdfUrl, '_blank');
      win?.print();
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = generateSimulationCSV(metrics, config);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UrbanResilience_Data_${config.id}.csv`;
    a.click();
  };

  // Export Excel XLSX
  const handleExportExcel = () => {
    if (replicationsStats.length > 0) {
      exportScenarioSummaryToExcel(replicationsStats);
    } else {
      alert('Veuillez d’abord exécuter la campagne de réplications pour obtenir les statistiques multi-scénarios.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with AppLogo */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AppLogo variant="header" />
            <span className="text-slate-600 hidden md:inline">|</span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Rapports Scientifiques & Historique PDF
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Génération A4 multi-pages conforme aux normes de publication, tableaux comparatifs S0-S4 et exports CSV/XLSX
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-md transition"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Génération en cours...' : 'Générer le Rapport PDF'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition"
              title="Exporter au format CSV UTF-8"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition"
              title="Exporter le classeur Excel XLSX (5 feuilles)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel (XLSX)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PDF Preview & Interactive Viewport */}
      {activePdfUrl ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Aperçu du Rapport PDF — A4 Scientifique
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintPdf}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger PDF</span>
              </button>
            </div>
          </div>

          <iframe
            title="Prévisualisation PDF"
            src={activePdfUrl}
            className="w-full h-[620px] rounded-lg border border-slate-800 bg-slate-950"
          />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3 shadow-lg">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Aucun rapport PDF prévisualisé</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cliquez sur « Générer le Rapport PDF » ci-dessus pour compiler instantanément les données réelles calculées par le moteur de simulation.
          </p>
        </div>
      )}

      {/* 3. Report History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Historique des Rapports Générés ({reportHistory.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Stockage local éphémère</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Titre du Rapport</th>
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Scénario</th>
                <th className="py-2.5 px-3">Réplications</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {reportHistory.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{rep.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {rep.id}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{rep.createdAt}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] border border-emerald-800 font-bold">
                      {rep.scenarioId}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{rep.replicationsCount} réplications</td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{rep.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    {rep.pdfDataUrl && (
                      <button
                        onClick={() => {
                          setActivePdfUrl(rep.pdfDataUrl || null);
                          setSelectedReportId(rep.id);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Aperçu</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadPdf()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Télécharger</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
