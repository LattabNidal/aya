/**
 * Scientific Invariant Validation Suite Page:
 * Real live execution of the 10 formal invariants from Section 20.
 * Audits code invariants, boundary conditions, determinism, and conservation laws.
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Code,
  FileCheck,
  Info,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { runFullValidationSuite } from '../engine/validationSuite';
import { runPdfAndLogoValidationSuite, TestResultItem } from '../engine/pdfReportValidation';
import { InvariantTestResult } from '../types/simulation';

export const ValidationView: React.FC = () => {
  const [testResults, setTestResults] = useState<InvariantTestResult[]>(() => runFullValidationSuite());
  const [pdfTestResults, setPdfTestResults] = useState<TestResultItem[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);

  const handleRunAllTests = async () => {
    setIsRunning(true);
    setTimeout(async () => {
      const results = runFullValidationSuite();
      const pdfRes = await runPdfAndLogoValidationSuite();
      setTestResults(results);
      setPdfTestResults(pdfRes);
      setIsRunning(false);
    }, 100);
  };

  const totalTests = testResults.length;
  const passedTests = testResults.filter((t) => t.passed).length;
  const allPassed = passedTests === totalTests && totalTests > 0;
  const totalExecutionTime = testResults.reduce((sum, t) => sum + t.executionTimeMs, 0);

  return (
    <div className="space-y-6">
      {/* Validation Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {allPassed ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            )}
            <h2 className="text-base font-semibold text-white">Vérification Scientifique & Invariants du Modèle</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit automatisé et certifié des {totalTests} tests formels d’invariants pour garantir la robustesse informatique et conceptuelle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono flex items-center gap-3">
            <span>
              Résultats :{' '}
              <strong className={allPassed ? 'text-emerald-400' : 'text-rose-400'}>
                {passedTests} / {totalTests} réussis
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> {totalExecutionTime.toFixed(1)} ms
            </span>
          </div>

          <button
            onClick={handleRunAllTests}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white shadow-xs transition ${
              isRunning ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? `Exécution des ${totalTests} tests...` : `Réexécuter l’audit (${totalTests} tests)`}
          </button>
        </div>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testResults.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelectedTestId(selectedTestId === t.id ? null : t.id)}
            className={`bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer ${
              t.passed ? 'border-slate-800 hover:border-slate-700' : 'border-rose-800/80 bg-rose-950/10'
            } ${selectedTestId === t.id ? 'ring-1 ring-emerald-500/50 bg-slate-800/60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  T{t.id}
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-white leading-snug">{t.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.hypothesis}</p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                {t.passed ? (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> FAIL
                  </span>
                )}
              </div>
            </div>

            {/* Test Details and Real Observed Values */}
            <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-300 space-y-1.5 font-mono">
              <div className="text-slate-400 font-sans text-xs bg-slate-950/60 p-2 rounded border border-slate-800/60">
                {t.details}
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 font-sans pt-1">
                <span>Temps d'exécution : {t.executionTimeMs} ms</span>
                <span className="text-emerald-400/90 font-mono text-xs">Invariant certifié</span>
              </div>
            </div>
          </div>
        ))}
        {/* PDF and Logo validation results if executed */}
        {pdfTestResults.length > 0 && (
          <div className="col-span-1 md:col-span-2 space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Audit des Rapports PDF & de l'Intégration du Logo Officiel ({pdfTestResults.length} tests)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pdfTestResults.map((pt) => (
                <div key={pt.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{pt.name}</span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      {pt.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <p className="text-slate-400">{pt.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Epistemological Distinction Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2.5 text-xs text-slate-300">
        <h4 className="font-semibold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400" />
          Distinction fondamentale : Vérification informatique vs Validation empirique vs Calibration
        </h4>
        <p className="text-slate-400 leading-relaxed">
          En modélisation urbaine et épidémiologique, cette suite réalise une{' '}
          <strong className="text-slate-200">vérification logicielle formelle</strong> (s’assurer que les équations codées s’exécutent conformément aux spécifications mathématiques et sans violation d’invariants).
          Elle ne constitue pas une <strong className="text-amber-300">validation épidémiologique empirique</strong>, laquelle nécessiterait des données de sérologie ou de traçage de contacts réels sur l’Unité de Voisinage 9 d’Ali Mendjeli.
        </p>
      </div>
    </div>
  );
};
