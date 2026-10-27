/**
 * Scientific Documentation, Hypotheses & AnyLogic Interoperability Module:
 * Equations, units, verified scientific bibliography, methodology caveats,
 * and AnyLogic variable mapping dictionary.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Code,
  Download,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Share2,
} from 'lucide-react';
import { ANYLOGIC_PARAMETER_MAPPING, exportConfigForAnyLogic } from '../engine/anylogicAdapter';
import { ScenarioConfig } from '../types/simulation';

interface DocumentationViewProps {
  currentConfig: ScenarioConfig;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({ currentConfig }) => {
  const [activeSubTab, setActiveSubTab] = useState<'equations' | 'hypotheses' | 'limites' | 'bibliography' | 'anylogic'>('equations');

  const handleExportAnyLogic = () => {
    exportConfigForAnyLogic(currentConfig);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Cadre Scientifique, Hypothèses & Interopérabilité AnyLogic</h2>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('equations')}
            className={`px-3 py-1 font-medium rounded transition ${
              activeSubTab === 'equations' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Équations & Formulation
          </button>
          <button
            onClick={() => setActiveSubTab('hypotheses')}
            className={`px-3 py-1 font-medium rounded transition ${
              activeSubTab === 'hypotheses' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hypothèses & Paramètres UV9
          </button>
          <button
            onClick={() => setActiveSubTab('limites')}
            className={`px-3 py-1 font-medium rounded transition ${
              activeSubTab === 'limites' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Limites & Données Manquantes
          </button>
          <button
            onClick={() => setActiveSubTab('bibliography')}
            className={`px-3 py-1 font-medium rounded transition ${
              activeSubTab === 'bibliography' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bibliographie Vérifiée
          </button>
          <button
            onClick={() => setActiveSubTab('anylogic')}
            className={`px-3 py-1 font-medium rounded transition ${
              activeSubTab === 'anylogic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Passerelle AnyLogic
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Equations & Scientific Formulation */}
      {activeSubTab === 'equations' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              1. Modèle de Contact Physique et Proximité Spatiale
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              La distance euclidienne instantanée entre deux agents piétons i et j de positions (x_i, y_i) et (x_j, y_j) est calculée par :
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-sm text-emerald-400 text-center">
              d(i, j) = √((x_i - x_j)² + (y_i - y_j)²)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Deux agents sont considérés en <strong>contact de proximité</strong> si d(i, j) ≤ d_seuil (seuil de référence standardisé à 2.0 mètres).
              L’application distingue rigoureusement :
            </p>
            <ul className="text-xs text-slate-400 list-disc pl-5 space-y-1">
              <li><strong>Contacts instantanés :</strong> Nombre de paires distinctes situées à moins de 2 mètres au pas de temps t.</li>
              <li><strong>Paires uniques :</strong> Nombre cumulé de paires uniques d’individus ayant interagi au moins une fois.</li>
              <li><strong>Épisodes de contact :</strong> Événements continus entre une même paire avec durée cumulée D en minutes, sans double-comptage intempestif.</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              2. Fonction de Risque de Contamination Modulaire
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Le risque de transmission en milieu extérieur est modélisé par une probabilité cumulative exponentielle sur l’intervalle d’exposition Δt (en minutes) :
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-sm text-indigo-400 text-center">
              P = 1 - exp(-λ × Δt)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Le taux instantané de hasard λ dérive de la composition de facteurs environnementaux indépendants :
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-sm text-amber-400 text-center">
              λ = p_base × f_distance(d) × f_climat(T, RH) × f_vent(v) × f_végétation(g)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
              <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
                <strong className="text-slate-200">f_distance(d) — Décroissance spatiale :</strong>
                <p className="text-slate-400 mt-1 font-mono">f_distance(d) = (1 - d / d_max)^1.5 pour d ≤ d_max ; 0 sinon.</p>
                <p className="text-slate-500 mt-1 text-xs">Exprime la dilution radiale du panache de gouttelettes expirées.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
                <strong className="text-slate-200">f_vent(v) — Dispersion aéraulique :</strong>
                <p className="text-slate-400 mt-1 font-mono">f_vent(v) = 1 / (1 + 0.35 × v)</p>
                <p className="text-slate-500 mt-1 text-xs">En extérieur, un vent plus soutenu accélère la dilution turbulente.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
                <strong className="text-slate-200">f_climat(T, RH) — Température et humidité :</strong>
                <p className="text-slate-400 mt-1 font-mono">Modulateur thermique (optimum 20°C) × hygrométrie relative.</p>
                <p className="text-slate-500 mt-1 text-xs">Influence la stabilité des microgouttelettes respiratoires.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
                <strong className="text-slate-200">f_végétation(g) — Filtration & ombrage :</strong>
                <p className="text-slate-400 mt-1 font-mono">f_veg = 1 - 0.28 × densité_canopée</p>
                <p className="text-slate-500 mt-1 text-xs">Captation particulaire partielle par les écrans de feuillage.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Hypotheses & Urban Parameters */}
      {activeSubTab === 'hypotheses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">Distinction des Paramètres : Données Terrain vs Hypothèses Exploratoires</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Pour assurer la transparence requise par la recherche académique, chaque paramètre est explicitement classifié selon sa provenance :
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Paramètre</th>
                  <th className="py-2.5 px-3">Nature / Statut</th>
                  <th className="py-2.5 px-3">Valeur par défaut</th>
                  <th className="py-2.5 px-3">Remarques scientifiques</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Morphologie bâti UV9</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">Terrain (Schématique)</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">500m × 400m</td>
                  <td className="py-2.5 px-3 text-slate-400">Emprises des barres R+5 et plots R+9 à Ali Mendjeli.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Données climatiques ENVI-met</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">Modélisation microclimat</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">9h (24.2°C), 13h (33.8°C), 18h (28.5°C)</td>
                  <td className="py-2.5 px-3 text-slate-400">Sorties représentatives ENVI-met pour l'été constantinois.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Flux piétons par rue</td>
                  <td className="py-2.5 px-3 text-sky-400 font-mono">Observations & comptages</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">Rue A: 420 p/h, Rue B: 180, C: 110, D: 260</td>
                  <td className="py-2.5 px-3 text-slate-400">Axe central marchand concentrant la majorité des flux.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Taux de risque p_base</td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono">Hypothèse non calibrée</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">0.045 / min</td>
                  <td className="py-2.5 px-3 text-slate-400">Arbitré à fin d'analyse comparative relative inter-scénarios.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Infectieux initiaux (I₀)</td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono">Paramètre explicite</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">4 agents (2.5% de la pop)</td>
                  <td className="py-2.5 px-3 text-slate-400">Faible fraction réaliste (jamais 80%).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab: Limites Méthodologiques & Données Manquantes */}
      {activeSubTab === 'limites' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Transparence Épistémologique & Périmètre de Validité</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distinction stricte entre les fonctions algorithmiques validées, les limites intrinsèques et les données manquantes.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono rounded bg-amber-950 text-amber-300 border border-amber-800">
                Avertissement Académique
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* 1. Fonctions testées */}
              <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
                <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  1. Fonctions Réellement Testées
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Vérification par exécution formelle des 16 invariants scientifiques :
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[11px]">
                  <li>Détection géométrique &amp; grille spatiale dynamique (proximité &lt; 2.0 m)</li>
                  <li>Suivi d’épisodes continus (durée sans surcomptage)</li>
                  <li>Conservation démographique &amp; SIR (S + I + R = N)</li>
                  <li>Non-traversée des polygones bâtis UV9 (0.0000% collision)</li>
                  <li>Déterminisme bit-à-bit du PRNG Mulberry32</li>
                  <li>30 réplications avec graines communes &amp; IC 95% Student-t</li>
                  <li>Exactitude des totaux exportés (.xlsx, .csv, .json)</li>
                </ul>
              </div>

              {/* 2. Limites du modèle */}
              <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
                <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  2. Limites Intrinsèques du Modèle
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Simplifications nécessaires à la simulation interactive :
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                  <li><strong>Cinématique 2D :</strong> Déplacement orienté par corridors avec vitesse moyenne (1.2 m/s), sans micro-négociation psychologique complexe d’évitement piéton.</li>
                  <li><strong>Aérodynamique semi-analytique :</strong> Facteur de dispersion f_vent et filtration f_veg basés sur formulations empiriques, et non sur un solveur CFD 3D instationnaire Navier-Stokes.</li>
                  <li><strong>Usage comparatif exclusif :</strong> L’indicateur de risque relatif Δ% entre scénarios est scientifiquement valide, mais le nombre absolu d'infectés finaux n'est pas une prédiction épidémiologique absolue.</li>
                </ul>
              </div>

              {/* 3. Données réelles manquantes */}
              <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
                <h4 className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  3. Données Réelles Manquantes
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Données de terrain non disponibles pour calibration absolue :
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                  <li><strong>Données cliniques locales :</strong> Absence de taux d’attaque sérologiques ou de charge virale mesurée in-situ à Ali Mendjeli pour calibrer p_base.</li>
                  <li><strong>Comptages IoT haute fréquence :</strong> Données piétonnes fondées sur comptages manuels indicatifs et non sur tracking vidéo/Bluetooth continu.</li>
                  <li><strong>Microclimat stationnaire :</strong> Interpolation à partir de simulations ENVI-met représentatives de l'été constantinois et non d'un réseau dense de micro-stations météo physiques réelles.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Verified Bibliography */}
      {activeSubTab === 'bibliography' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-base font-semibold text-white">Bibliographie Scientifique Vérifiée (Cadre conceptuel)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Références fondatrices sur le microclimat urbain, la ventilation et l’exposition en espace public extérieur.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 font-sans text-xs">Guo et al. (2021)</strong>
              <p className="text-slate-300 mt-1">
                Rôle des ceintures végétales et des alignements d'arbres urbains dans la filtration particulaire, la dispersion aérosol et l'atténuation du stress microclimatique en milieu résidentiel dense.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 font-sans text-xs">Megahed & Ghoneim (2020)</strong>
              <p className="text-slate-300 mt-1">
                Morphologie urbaine, corridors de ventilation naturelle et résilience sanitaire post-pandémique dans les espaces publics extérieurs et zones marchandes informelles.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 font-sans text-xs">Chan et al. (2011)</strong>
              <p className="text-slate-300 mt-1">
                Survie et stabilité des agents pathogènes respiratoires en suspension selon la température ambiante et l’hygrométrie relative.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 font-sans text-xs">Feng et al. (2020)</strong>
              <p className="text-slate-300 mt-1">
                Dynamique des fluides et dilution des panaches respiratoires en environnement extérieur ventilé : modélisation de l'effet de sillage et de la vitesse de l'air.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 font-sans text-xs">Qian & Zheng (2018)</strong>
              <p className="text-slate-300 mt-1">
                Risque de transmission à courte distance dans les espaces collectifs et pertinence des seuils de distanciation physique de 1.5 à 2.0 mètres.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 font-sans text-xs">Bowler et al. (2010)</strong>
              <p className="text-slate-300 mt-1">
                Méta-analyse de l’effet de refroidissement des espaces verts urbains (Urban greening cooling effect) sur la température de l'air et le confort thermique piétonnier.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: AnyLogic Interoperability */}
      {activeSubTab === 'anylogic' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Dictionnaire de Correspondance avec AnyLogic</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assure la compatibilité conceptuelle et l'échange de paramètres avec un modèle d'agents AnyLogic (.alp).
                </p>
              </div>

              <button
                onClick={handleExportAnyLogic}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter paramètres pour AnyLogic (JSON)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Variable SimLab</th>
                    <th className="py-2.5 px-3">Paramètre AnyLogic</th>
                    <th className="py-2.5 px-3">Type / Unité</th>
                    <th className="py-2.5 px-3 font-sans">Description & Règle d’équivalence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ANYLOGIC_PARAMETER_MAPPING.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{m.appletVariable}</td>
                      <td className="py-2.5 px-3 font-bold text-sky-400">{m.anylogicParameter}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {m.type} ({m.unit})
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        {m.description} — <span className="text-slate-400 text-xs italic">{m.notes}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <strong className="text-slate-200">Avertissement d'exécution autonome :</strong>
              <p>
                UrbanResilience SimLab fonctionne de manière 100% autonome avec son propre moteur déterministe local sans dépendance externe requise.
                Cette passerelle fournit les tables de correspondance pour répliquer ou confronter les résultats avec AnyLogic.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
