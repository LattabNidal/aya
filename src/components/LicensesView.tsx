/**
 * Sources & Licenses — Attribution Registry & Legal Compliance
 * Exhaustive catalog of all 3D assets, libraries, scientific references,
 * and Creative Commons attributions for UrbanResilience SimLab.
 */

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCode,
  FolderOpen,
  Layers,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { SKETCHFAB_CATALOG, SketchfabAsset } from '../data/sketchfabAssets';

export const LicensesView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Sources, Licences & Registre d'Attribution
              </h2>
              <span className="text-slate-500">·</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                Conformité Creative Commons & Open Source
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Ce registre recense l'ensemble des ressources 3D, bibliothèques logicielles, données géographiques et modèles d'attraction mobilisés au sein de la plateforme <strong>UrbanResilience SimLab</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Legal Directives & API Compliance Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Shield className="w-4 h-4" />
            <span>Respect des Droits d'Auteur</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Chaque modèle tiers intégré via Sketchfab fait l'objet d'un suivi strict de sa licence (CC-BY 4.0, CC0). La mention d'attribution légale est obligatoirement affichée et exportable.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <FileCode className="w-4 h-4" />
            <span>Format Normalisé glTF/GLB</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Priorité accordée aux formats standards ouverts du Khronos Group (glTF 2.0 / GLB). Si un modèle n'est disponible qu'en visualisation, il est maintenu dans le visualiseur sans extraction forcée de fichier.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>Sécurité des Clés d'API</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Aucun secret d'authentification ni jeton privé n'est enregistré dans le code côté client. Les accès Data/Download API s'effectuent via des en-têtes sécurisés ou des sessions locales éphémères.
          </p>
        </div>
      </div>

      {/* 3. Catalog of Registered 3D Assets (Table & Cards) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Inventaire Exhaustif des Assets 3D Sketchfab ({SKETCHFAB_CATALOG.length} modèles)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">CC-BY 4.0 / CC0</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Modèle / Titre</th>
                <th className="py-2.5 px-3">Auteur & Lien</th>
                <th className="py-2.5 px-3">UID Sketchfab</th>
                <th className="py-2.5 px-3">Licence</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Complexité</th>
                <th className="py-2.5 px-3">Attribution légale requise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {SKETCHFAB_CATALOG.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{asset.title}</div>
                    <div className="text-[10px] text-slate-400">{asset.category.replace('_', ' ')}</div>
                  </td>
                  <td className="py-3 px-3">
                    <a
                      href={asset.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{asset.author}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      {asset.uid.substring(0, 10)}...
                    </a>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 font-mono text-[10px] border border-emerald-800">
                      {asset.license}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                    {asset.format}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    {asset.polygonCount.toLocaleString()} poly
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-300 truncate max-w-xs" title={asset.attribution}>
                        {asset.attribution}
                      </span>
                      <button
                        onClick={() => copyToClipboard(asset.attribution, asset.id)}
                        className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700 shrink-0"
                        title="Copier l'attribution légale"
                      >
                        {copiedId === asset.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Scientific Libraries & Technical References */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Moteurs de Rendu & Bibliothèques Scientifiques Open Source
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white">Three.js (r174)</div>
            <div className="text-slate-400">Bibliothèque 3D WebGL / WebGPU — Licence MIT</div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              Moteur de rendu 3D temps réel, pipeline PBR, ombrage PCFSoftShadowMap, PMREMGenerator pour RoomEnvironment et gestion des meshes instanciés (InstancedMesh).
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white">Mulberry32 PRNG Déterministe</div>
            <div className="text-slate-400">Générateur Pseudo-Aléatoire Déterministe 32-bit</div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              Garantit la reproductibilité absolue des trajectoires, contacts et transmissions épidémiologiques entre réplications à graine fixée (testé 100% invariant).
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white">SheetJS / XLSX</div>
            <div className="text-slate-400">Export tableur multi-feuilles — Licence Apache 2.0</div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              Génération des 5 feuilles de calcul scientifiques (Synthèse comparative, Détail réplications, Données climatiques, Analyse sensibilité et Rapport d'audit).
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white">AnyLogic Simulation Reference</div>
            <div className="text-slate-400">Paradigme Multi-Agents Piétonnier (ABM / Pedestrian Dynamics)</div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              Modélisation des vitesses de marche (0.8 à 1.4 m/s), évitement d'obstacles par forces sociales et attractions gravitationnelles vers les étals et places.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
