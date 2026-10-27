/**
 * Sketchfab Hub & 3D Asset Library
 * Mode 1: Official Sketchfab Viewer (embed, validation, fullscreen, error boundaries)
 * Mode 2: 10 Urban Categories Asset Library (verified CC-BY/CC0 models, credentials UI)
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Armchair,
  BookOpen,
  Building2,
  Car,
  CheckCircle,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FolderOpen,
  Key,
  Layers,
  LayoutGrid,
  Lightbulb,
  Maximize2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Store,
  Trees,
  Users,
} from 'lucide-react';
import {
  CategoryInfo,
  extractSketchfabUid,
  SKETCHFAB_CATALOG,
  SketchfabAsset,
  URBAN_CATEGORIES,
  UrbanAssetCategory,
} from '../../data/sketchfabAssets';
import { SpatialLayout, UrbanFurniture } from '../../types/simulation';

interface SketchfabHubProps {
  layout?: SpatialLayout;
  onUpdateSpatialLayout?: (newLayout: SpatialLayout) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SketchfabHub: React.FC<SketchfabHubProps> = ({
  layout,
  onUpdateSpatialLayout,
  onNavigateTab,
}) => {
  const [activeMode, setActiveMode] = useState<'viewer' | 'library' | 'apiConfig'>('viewer');
  const [addedSuccessMsg, setAddedSuccessMsg] = useState<string | null>(null);

  // Add Sketchfab 3D asset to simulation spatial layout
  const handleAddToProject = (asset: SketchfabAsset) => {
    if (!layout || !onUpdateSpatialLayout) return;

    const newFurnitureItem: UrbanFurniture = {
      id: `fur_sketchfab_${Date.now().toString().slice(-4)}`,
      name: asset.title,
      category: 'sketchfab',
      x: Math.floor(Math.random() * 200) + 150,
      y: Math.floor(Math.random() * 150) + 100,
      width: 15,
      height: 15,
      sketchfabUid: asset.uid,
      sketchfabTitle: asset.title,
      modelUrl: asset.url,
    };

    const currentFurniture = layout.urbanFurniture || [];
    const updatedLayout: SpatialLayout = {
      ...layout,
      urbanFurniture: [...currentFurniture, newFurnitureItem],
      note: `Ajout de l'asset 3D "${asset.title}" depuis Sketchfab`,
    };

    onUpdateSpatialLayout(updatedLayout);
    setAddedSuccessMsg(`✓ Asset 3D "${asset.title}" ajouté avec succès sur le site de l'UV9 !`);
    setTimeout(() => setAddedSuccessMsg(null), 5000);
  };

  // Mode 1: Viewer states
  const [inputUrl, setInputUrl] = useState<string>('https://sketchfab.com/3d-models/low-poly-apartment-building-98d36398418a427fbf27fb0534c0179a');
  const [activeUid, setActiveUid] = useState<string>('98d36398418a427fbf27fb0534c0179a');
  const [activeModelTitle, setActiveModelTitle] = useState<string>('Modern Residential Apartment Building (R+5)');
  const [activeModelAuthor, setActiveModelAuthor] = useState<string>('IvanNorman');
  const [activeModelUrl, setActiveModelUrl] = useState<string>('https://sketchfab.com/3d-models/low-poly-apartment-building-98d36398418a427fbf27fb0534c0179a');
  const [activeLicense, setActiveLicense] = useState<string>('CC-BY-4.0');
  const [viewerLoading, setViewerLoading] = useState<boolean>(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Mode 2: Library states
  const [selectedCategory, setSelectedCategory] = useState<UrbanAssetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [licenseFilter, setLicenseFilter] = useState<string>('all');

  // API Config states
  const [apiToken, setApiToken] = useState<string>('');
  const [isTokenSaved, setIsTokenSaved] = useState<boolean>(false);

  // Handle URL submission in Viewer
  const handleLoadModel = (urlToLoad?: string) => {
    const target = urlToLoad || inputUrl;
    setViewerError(null);
    const uid = extractSketchfabUid(target);

    if (!uid) {
      setViewerError(
        'Format de lien invalide. Veuillez coller une URL Sketchfab valide (ex: https://sketchfab.com/3d-models/... ou un identifiant hexadécimal à 32 caractères).'
      );
      return;
    }

    setViewerLoading(true);
    setActiveUid(uid);

    // Check if it matches a catalog asset
    const catalogMatch = SKETCHFAB_CATALOG.find((a) => a.uid.toLowerCase() === uid.toLowerCase());
    if (catalogMatch) {
      setActiveModelTitle(catalogMatch.title);
      setActiveModelAuthor(catalogMatch.author);
      setActiveModelUrl(catalogMatch.url);
      setActiveLicense(catalogMatch.license);
    } else {
      setActiveModelTitle(`Modèle Sketchfab [${uid.substring(0, 8)}...]`);
      setActiveModelAuthor('Auteur vérifiable sur Sketchfab');
      setActiveModelUrl(`https://sketchfab.com/models/${uid}`);
      setActiveLicense('Licence à vérifier sur Sketchfab');
    }

    // Short timeout to simulate initialization
    setTimeout(() => {
      setViewerLoading(false);
    }, 600);
  };

  // Preview catalog asset in Viewer
  const handlePreviewAsset = (asset: SketchfabAsset) => {
    setActiveUid(asset.uid);
    setActiveModelTitle(asset.title);
    setActiveModelAuthor(asset.author);
    setActiveModelUrl(asset.url);
    setActiveLicense(asset.license);
    setInputUrl(asset.url);
    setActiveMode('viewer');
    setViewerError(null);
  };

  // Filter catalog items
  const filteredAssets = SKETCHFAB_CATALOG.filter((asset) => {
    const matchesCat = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLicense = licenseFilter === 'all' || asset.license === licenseFilter;
    return matchesCat && matchesSearch && matchesLicense;
  });

  // Category Icon helper
  const renderCategoryIcon = (id: UrbanAssetCategory) => {
    switch (id) {
      case 'residential_buildings':
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'facades_blocks':
        return <LayoutGrid className="w-4 h-4 text-cyan-400" />;
      case 'trees_vegetation':
        return <Trees className="w-4 h-4 text-emerald-500" />;
      case 'street_furniture':
        return <Armchair className="w-4 h-4 text-amber-400" />;
      case 'roads_sidewalks':
        return <Compass className="w-4 h-4 text-slate-400" />;
      case 'markets_shops':
        return <Store className="w-4 h-4 text-orange-400" />;
      case 'characters_pedestrians':
        return <Users className="w-4 h-4 text-sky-400" />;
      case 'vehicles':
        return <Car className="w-4 h-4 text-indigo-400" />;
      case 'street_lighting':
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'outdoor_equipment':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Navigation Modes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Plateforme Sketchfab & Écosystème 3D
              </h2>
              <span className="text-slate-500">·</span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
                Viewer API v1.12 & Data API v3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visualisation interactive de maquettes 3D officielles et bibliothèque de composants urbains classés
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveMode('viewer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeMode === 'viewer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Mode 1 — Visualiseur Sketchfab</span>
            </button>
            <button
              onClick={() => setActiveMode('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeMode === 'library'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Mode 2 — Bibliothèque 10 Catégories</span>
            </button>
            <button
              onClick={() => setActiveMode('apiConfig')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeMode === 'apiConfig'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Configuration API & Téléchargement</span>
            </button>
          </div>
        </div>
      </div>

      {addedSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{addedSuccessMsg}</span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('digitalTwin')}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition shrink-0"
            >
              🚀 Voir dans Jumeau Numérique
            </button>
          )}
        </div>
      )}

      {/* 2. MODE 1: VISUALISEUR SKETCHFAB */}
      {activeMode === 'viewer' && (
        <div className="space-y-4">
          {/* Link Input Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="text-xs font-semibold text-slate-300">
              Coller un lien public ou un identifiant de modèle Sketchfab :
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://sketchfab.com/3d-models/nom-du-modele-98d36398418a427fbf27fb0534c0179a"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleLoadModel()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Charger le Modèle</span>
              </button>
            </div>

            {/* Quick Test Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-medium">Modèles de test vérifiés:</span>
              {SKETCHFAB_CATALOG.slice(0, 4).map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    setInputUrl(asset.url);
                    handleLoadModel(asset.url);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 font-sans text-xs transition"
                >
                  {asset.title.split('(')[0].trim()}
                </button>
              ))}
            </div>

            {/* Error Message */}
            {viewerError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Erreur de chargement du modèle</div>
                  <div className="text-rose-300">{viewerError}</div>
                  <div className="text-rose-400 text-[11px]">
                    Astuce: assurez-vous que le modèle est public sur Sketchfab et que le slug contient son UID de 32 caractères hexadécimaux.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Viewer Panel */}
          <div
            className={`relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all ${
              isFullscreen ? 'fixed inset-4 z-50' : 'h-[580px]'
            }`}
          >
            {/* Header info bar */}
            <div className="absolute top-0 inset-x-0 z-20 bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs backdrop-blur-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white truncate max-w-sm">{activeModelTitle}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">Auteur : <span className="text-emerald-400 font-medium">{activeModelAuthor}</span></span>
                <span className="text-slate-500">|</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                  {activeLicense}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeModelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition"
                  title="Ouvrir la page originale sur Sketchfab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Page originale</span>
                </a>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700"
                  title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Embedded Sketchfab Viewer IFrame */}
            <div className="w-full h-full pt-10">
              {activeUid ? (
                <iframe
                  title={activeModelTitle}
                  src={`https://sketchfab.com/models/${activeUid}/embed?autostart=1&camera=0&ui_theme=dark&dnt=1`}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; xr-spatial-tracking"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-3">
                  <Eye className="w-12 h-12 text-slate-700" />
                  <p className="text-sm">Aucun modèle chargé. Collez un lien Sketchfab ci-dessus ou sélectionnez un modèle du catalogue.</p>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="absolute bottom-0 inset-x-0 z-20 bg-slate-900/90 border-t border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Intégration conforme aux conditions d'utilisation de l'API Viewer de Sketchfab.
              </span>
              <span className="font-mono text-slate-500">UID: {activeUid}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODE 2: BIBLIOTHÈQUE D'ASSETS 3D (10 CATÉGORIES) */}
      {activeMode === 'library' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Keyword Search */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un asset urbain (immeuble, platane, lampadaire, tramway...)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* License Filter */}
              <div>
                <select
                  value={licenseFilter}
                  onChange={(e) => setLicenseFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Toutes les licences</option>
                  <option value="CC-BY-4.0">Creative Commons CC-BY 4.0</option>
                  <option value="CC0">Domaine Public CC0</option>
                </select>
              </div>
            </div>

            {/* 10 Categories Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Toutes les catégories ({SKETCHFAB_CATALOG.length})
              </button>
              {URBAN_CATEGORIES.map((cat) => {
                const count = SKETCHFAB_CATALOG.filter((a) => a.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {renderCategoryIcon(cat.id)}
                    <span>{cat.nameFr.replace(/^[0-9]+\.\s*/, '')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col transition"
              >
                {/* Thumbnail Header */}
                <div className="relative h-44 bg-slate-950 overflow-hidden">
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-white flex items-center gap-1">
                    {renderCategoryIcon(asset.category)}
                    <span>{asset.format}</span>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-700 text-[10px] font-mono font-bold text-emerald-400">
                    {asset.license}
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-slate-300">
                    {asset.polygonCount.toLocaleString()} polygones
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{asset.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <span>Par</span>
                      <a
                        href={asset.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline font-medium"
                      >
                        {asset.author}
                      </a>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {asset.description}
                    </p>
                  </div>

                  {/* Attribution Snippet */}
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-slate-400 font-mono">
                    <span className="text-slate-500 font-bold block">Attribution requise:</span>
                    <span className="line-clamp-2">{asset.attribution}</span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => handleAddToProject(asset)}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-sm"
                      title="Ajouter cet objet 3D sur le plan et jumeau numérique"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      <span>+ Ajouter au Site</span>
                    </button>

                    <button
                      onClick={() => handlePreviewAsset(asset)}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition"
                      title="Prévisualiser dans le visualiseur Sketchfab"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                      title="Consulter la page originale Sketchfab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAssets.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <FolderOpen className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucun modèle ne correspond aux filtres.</p>
              <p className="text-xs">Essayez d'élargir vos termes de recherche ou de sélectionner une autre catégorie.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. CONFIGURATION API & TÉLÉCHARGEMENT */}
      {activeMode === 'apiConfig' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-700 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Connexion API Sketchfab (Data API & Download API)</h3>
              <p className="text-xs text-slate-400">
                Protocole officiel d'authentification pour la recherche étendue et le téléchargement automatisé
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Politique de Sécurité & Non-Exposition des Secrets</span>
              </div>
              <p>
                Conformément aux normes de sécurité, aucun secret client ni jeton sensible ne doit être injecté directement dans le code source du navigateur. Toutes les requêtes de téléchargement de maillage 3D via la <strong>Download API</strong> nécessitent un jeton d'accès utilisateur ou un flux OAuth 2.0.
              </p>
              <p className="text-slate-400">
                Documentation officielle :{' '}
                <a
                  href="https://sketchfab.com/developers/download-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 underline font-mono"
                >
                  https://sketchfab.com/developers/download-api
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-300 font-medium">
                Jeton API Sketchfab (API Token de session) :
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => {
                    setApiToken(e.target.value);
                    setIsTokenSaved(false);
                  }}
                  placeholder="Collez votre jeton Sketchfab personnel..."
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => setIsTokenSaved(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs transition"
                >
                  Enregistrer
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Ce jeton reste temporairement conservé dans la session de l'application et n'est jamais sauvegardé sur un serveur distant public.
              </p>
            </div>

            {isTokenSaved && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Jeton API Sketchfab configuré avec succès pour la session active.</span>
              </div>
            )}

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="font-semibold text-slate-200">Conditions de Téléchargement :</div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Les modèles sous licence Creative Commons CC-BY, CC-BY-SA et CC0 autorisent l'utilisation avec mention d'attribution.</li>
                <li>Les modèles dont l'auteur a désactivé le téléchargement restent consultables via le <strong>Viewer officiel</strong> sans extraction de fichier.</li>
                <li>Le format glTF / GLB est le format normalisé recommandé pour Three.js.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
