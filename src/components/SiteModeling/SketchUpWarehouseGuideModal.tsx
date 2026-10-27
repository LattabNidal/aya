/**
 * SketchUp 3D Warehouse & 3D Repositories Guide Modal
 * Guides users on accessing SketchUp 3D Warehouse, Sketchfab, TurboSquid, CGTrader,
 * and Poly Pizza to download and integrate 3D models into their urban site.
 */

import React from 'react';
import {
  ExternalLink,
  FolderOpen,
  Info,
  Layers,
  Sparkles,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { AppLogo } from '../AppLogo';

interface SketchUpWarehouseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModelImporter: () => void;
  onNavigateTab: (tab: string) => void;
}

export const SketchUpWarehouseGuideModal: React.FC<SketchUpWarehouseGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenModelImporter,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const REPOSITORIES = [
    {
      name: 'SketchUp 3D Warehouse',
      url: 'https://3dwarehouse.sketchup.com/',
      badge: 'Officiel Trimble SketchUp',
      color: 'rose',
      description:
        'La plus grande bibliothèque mondiale de modèles d’architecture, mobilier urbain, lampadaires, bancs, tramways et arbres.',
      searchExamples: ['mobilier urbain', 'lampadaire solaire', 'banc public', 'tramway', 'arbre 3d', 'algerian architecture'],
      exportInstructions:
        'Téléchargez le modèle en .SKP puis dans SketchUp : Fichier > Exporter > Modèle 3D... > choisissez format .OBJ ou .GLB.',
    },
    {
      name: 'Sketchfab (Intégré dans SimLab)',
      url: 'https://sketchfab.com/3d-models?features=downloadable',
      badge: 'Viewer API & Modèles Téléchargeables',
      color: 'indigo',
      description:
        'Des millions de modèles 3D avec matériaux PBR réalistes. Téléchargement direct au format GLTF / GLB prêt pour Three.js.',
      searchExamples: ['urban furniture', 'street lamp', 'bus stop', 'kiosk', 'apartment building'],
      exportInstructions:
        'Cliquez sur "Download 3D Model", choisissez le format glTF / GLB, puis glissez le fichier directement dans notre ModelImporter.',
    },
    {
      name: 'Poly Pizza (Low-Poly GLTF)',
      url: 'https://poly.pizza/',
      badge: '100% Gratuit CC0 / CC-BY',
      color: 'amber',
      description:
        'Modèles 3D low-poly ultra légers parfaits pour les simulations d’agents en temps réel sans latence GPU.',
      searchExamples: ['tree', 'bench', 'street light', 'car', 'shop'],
      exportInstructions:
        'Téléchargement immédiat en 1 clic au format .GLB. Aucun convertisseur requis.',
    },
    {
      name: 'TurboSquid & CGTrader',
      url: 'https://www.turbosquid.com/Search/3D-Models/free/urban',
      badge: 'Haute Résolution',
      color: 'sky',
      description:
        'Modèles architecturaux extérieurs professionnels, textures 4K et objets urbains contemporains.',
      searchExamples: ['urban architecture', 'exterior lamp', 'city bench'],
      exportInstructions:
        'Filtrez par "Free", téléchargez en .OBJ ou .FBX, et importez la texture associée.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Bibliothèques 3D Externes (SketchUp 3D Warehouse & Sketchfab)
                </h2>
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-800">
                  Guide d'Intégration
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comment chercher, télécharger et intégrer des modèles 3D (bâtiments, lampadaires, bancs, tramways, arbres) sur votre site.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AppLogo variant="watermark" />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">
          {/* Step by Step SketchUp Export Guide Banner */}
          <div className="bg-gradient-to-r from-slate-950 to-indigo-950 p-4 rounded-xl border border-indigo-900/60 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Comment exporter depuis SketchUp vers cette application en 3 clics :</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs pl-1">
              <li>Dans SketchUp, ouvrez votre modèle ou téléchargez-le depuis <strong>3D Warehouse</strong>.</li>
              <li>Allez dans le menu : <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono">Fichier &gt; Exporter &gt; Modèle 3D...</code></li>
              <li>Choisissez le type : <code className="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 font-mono">Fichier glTF (*.glb)</code> ou <code className="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 font-mono">Objet Wavefront (*.obj)</code>.</li>
              <li>Cliquez sur Exporter, puis <strong>glissez-déposez le fichier</strong> directement dans notre <strong>ModelImporter</strong> !</li>
            </ol>
          </div>

          {/* Repositories Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPOSITORIES.map((repo) => (
              <div
                key={repo.name}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{repo.name}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px] border border-slate-800">
                      {repo.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {repo.description}
                  </p>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Mots-clés suggérés :
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {repo.searchExamples.map((ex) => (
                        <span
                          key={ex}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]"
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                    <strong className="text-slate-300 block mb-0.5">Procédure d'export :</strong>
                    {repo.exportInstructions}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Ouvrir {repo.name.split('(')[0].trim()}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  {repo.name.includes('Sketchfab') && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('sketchfab');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Hub Sketchfab</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Formats 3D gérés nativement dans le jumeau numérique : <strong>.GLB</strong>, <strong>.glTF</strong>, <strong>.OBJ / .MTL</strong>.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenModelImporter();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ouvrir l'Importateur de Fichiers 3D (.GLB / .OBJ)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-semibold text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
