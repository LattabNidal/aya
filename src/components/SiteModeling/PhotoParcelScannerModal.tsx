/**
 * Photo Parcel Scanner Modal Component
 * Automatically recognizes land parcel boundaries, building footprints, scale bars,
 * and street corridors with interactive Orientation, Rotation, Scale, Offset,
 * and Red Sensitivity Calibration.
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Eye,
  FileCode,
  Layers,
  MapPin,
  Move,
  Play,
  RefreshCw,
  RotateCw,
  Ruler,
  Sliders,
  Sparkles,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { processSiteImageParcel, ParcelRecognitionResult } from '../../services/imageParcelRecognizer';
import { SpatialLayout } from '../../types/simulation';

interface PhotoParcelScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: SpatialLayout;
  onApplyReconstructedLayout: (newLayout: SpatialLayout) => void;
  onNavigateTab: (tab: string) => void;
}

export const PhotoParcelScannerModal: React.FC<PhotoParcelScannerModalProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onApplyReconstructedLayout,
  onNavigateTab,
}) => {
  const SAMPLE_ATTACHMENT_PATH = '/public/assets/aistudio/img-4-small580_7e53a501.png';

  const [selectedImageSrc, setSelectedImageSrc] = useState<string>(SAMPLE_ATTACHMENT_PATH);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ParcelRecognitionResult | null>(null);

  // Orientation & Calibration Controls
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [redSensitivity, setRedSensitivity] = useState<number>(1.0);

  // Active Tab in Modal: 'scan' | 'orientation'
  const [activeSubTab, setActiveSubTab] = useState<'scan' | 'orientation'>('orientation');

  if (!isOpen) return null;

  // Handle Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setSelectedImageSrc(src);
      setScanResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Run AI Parcel Scanner with active transform parameters
  const runScan = async () => {
    setIsScanning(true);
    const result = await processSiteImageParcel(selectedImageSrc, currentLayout, {
      rotationAngle,
      scaleFactor,
      offsetX,
      offsetY,
      redSensitivity,
    });
    setScanResult(result);
    setIsScanning(false);
  };

  // Run scan on mount or when transform options change
  useEffect(() => {
    if (isOpen) {
      runScan();
    }
  }, [isOpen, selectedImageSrc, rotationAngle, scaleFactor, offsetX, offsetY, redSensitivity]);

  // Apply reconstructed geometry to full app simulation
  const handleApplyToSimulation = () => {
    if (!scanResult) return;
    onApplyReconstructedLayout(scanResult.reconstructedLayout);
    onClose();
    onNavigateTab('digitalTwin');
  };

  // Preset rotation angles
  const handlePresetRotation = (angle: number) => {
    setRotationAngle(angle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo variant="header" />
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>Reconnaissance IA, Orientation & Calibration du Parcellaire</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Alignement précis du Nord, rotation du plan, cadrage et détection des polygones de parcelle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Subtabs: Orientation & Calibration vs Scanning Results */}
          <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('orientation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeSubTab === 'orientation'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>1. Orientation, Rotation & Cadrage</span>
              </button>

              <button
                onClick={() => setActiveSubTab('scan')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeSubTab === 'scan'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>2. Polygones & Synthèse des Parcelles</span>
              </button>
            </div>

            <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-2 transition">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Changer d'image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Live Canvas Preview with Orientation & Overlay */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-3 relative overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[380px]">
              <div className="relative w-full max-h-[380px] flex items-center justify-center overflow-hidden rounded-lg bg-slate-900/50">
                {/* Transformed Image Preview */}
                <div
                  className="transition-transform duration-200 ease-out flex items-center justify-center max-h-[360px]"
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotationAngle}deg) scale(${scaleFactor})`,
                  }}
                >
                  <img
                    src={selectedImageSrc}
                    alt="Source image parcel transformed"
                    className="max-h-[340px] w-auto object-contain rounded-lg"
                  />
                </div>

                {/* Detected Parcel Bounds & Polygon overlay */}
                {scanResult && !isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="absolute top-[38%] left-[42%] w-[22%] h-[16%] border-2 border-dashed border-red-500 bg-red-500/30 rounded flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                      <span className="bg-red-950 text-red-200 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border border-red-700">
                        Parcelle ({rotationAngle}°): {scanResult.redParcel.areaSqMeters} m²
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 bg-slate-950/90 text-amber-300 text-[10px] font-mono px-2 py-1 rounded border border-amber-500/50 flex items-center gap-1 shadow-md">
                      <Ruler className="w-3 h-3 text-amber-400" />
                      <span>Échelle: 0 - 100m</span>
                    </div>

                    {/* Compass North Arrow */}
                    <div className="absolute top-3 left-3 bg-slate-950/90 p-2 rounded-full border border-sky-500/50 shadow-md flex items-center justify-center">
                      <div
                        className="w-6 h-6 flex items-center justify-center text-red-500 font-bold text-xs"
                        style={{ transform: `rotate(${-rotationAngle}deg)` }}
                      >
                        ↑ N
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="w-full mt-3 pt-3 border-t border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-400">Orientation active:</span>
                <span className="font-mono text-sky-400 font-bold">
                  {rotationAngle}° Nord · Échelle {scaleFactor.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Right Column: Controls or Synthesis */}
            <div className="lg:col-span-5 space-y-4">
              {activeSubTab === 'orientation' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
                  <div className="font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <span>Contrôles d'Orientation du Plan</span>
                    </span>
                    <button
                      onClick={() => {
                        setRotationAngle(0);
                        setScaleFactor(1.0);
                        setOffsetX(0);
                        setOffsetY(0);
                        setRedSensitivity(1.0);
                      }}
                      className="text-[10px] text-slate-400 hover:text-white underline font-mono"
                    >
                      Réinitialiser
                    </button>
                  </div>

                  {/* Rotation Presets */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-medium">Presets d'Angle Nord:</label>
                    <div className="grid grid-cols-4 gap-1.5 font-mono font-bold">
                      {[0, 90, 180, 270].map((ang) => (
                        <button
                          key={ang}
                          onClick={() => handlePresetRotation(ang)}
                          className={`py-1.5 rounded border transition ${
                            rotationAngle === ang
                              ? 'bg-sky-600 text-white border-sky-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {ang}°
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rotation Fine Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Ajustement fin de rotation:</span>
                      <span className="font-mono text-sky-400 font-bold">{rotationAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={rotationAngle}
                      onChange={(e) => setRotationAngle(parseInt(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  {/* Zoom / Scale Factor Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Échelle d'Agrandissement (100m):</span>
                      <span className="font-mono text-emerald-400 font-bold">{scaleFactor.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={scaleFactor}
                      onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Offset X Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Décalage Horizontal (Axe X):</span>
                      <span className="font-mono text-slate-300">{offsetX} px</span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={offsetX}
                      onChange={(e) => setOffsetX(parseInt(e.target.value))}
                      className="w-full accent-slate-500"
                    />
                  </div>

                  {/* Offset Y Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Décalage Vertical (Axe Y):</span>
                      <span className="font-mono text-slate-300">{offsetY} px</span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={offsetY}
                      onChange={(e) => setOffsetY(parseInt(e.target.value))}
                      className="w-full accent-slate-500"
                    />
                  </div>

                  {/* Red Sensitivity Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Sensibilité de Détection de la Parcelle Rouge:</span>
                      <span className="font-mono text-red-400 font-bold">{redSensitivity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={redSensitivity}
                      onChange={(e) => setRedSensitivity(parseFloat(e.target.value))}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>
              )}

              {activeSubTab === 'scan' && scanResult && (
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-emerald-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Parcelle Rouge Orientée</span>
                      </span>
                      <span className="font-mono text-emerald-200">
                        {scanResult.redParcel.areaSqMeters.toLocaleString()} m²
                      </span>
                    </div>
                    <p className="text-emerald-400/90 text-[11px] leading-relaxed">
                      Centre: ({scanResult.redParcel.center.x}m, {scanResult.redParcel.center.y}m) — Surface:{' '}
                      {scanResult.redParcel.dimensions.width}m × {scanResult.redParcel.dimensions.height}m
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
                      <span>Sommets du Polygon Détectés</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                        {scanResult.redParcel.polygonPoints.length} points
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      {scanResult.redParcel.polygonPoints.map((pt, idx) => (
                        <div key={idx} className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300">
                          Pt #{idx + 1}: ({pt.x}m, {pt.y}m)
                        </div>
                      ))}
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                      {scanResult.analysisSummary}
                    </p>
                  </div>

                  <button
                    onClick={handleApplyToSimulation}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xl transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Appliquer au Jumeau Numérique & Lancer Simulation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Orientation du Plan: {rotationAngle}° Nord · Calibrage Métrique 100m</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab(activeSubTab === 'orientation' ? 'scan' : 'orientation')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              {activeSubTab === 'orientation' ? 'Voir Synthèse Parcelles →' : '← Ajuster Orientation'}
            </button>
            <button
              onClick={handleApplyToSimulation}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
            >
              Valider & Lancer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
