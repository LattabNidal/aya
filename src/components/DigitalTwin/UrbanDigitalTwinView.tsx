/**
 * Urban Digital Twin — Master 2D / 3D Spatial & Simulation Platform
 * Synchronized 2D Orthographic & 3D Three.js PBR views with spatial analysis tools,
 * real-time agent multi-pedestrian tracking, measurement ruler, and property inspector.
 */

import React, { useRef, useState } from 'react';
import {
  Activity,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Columns,
  Compass,
  Download,
  Eye,
  Flame,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Scissors,
  SkipForward,
  Sliders,
  Trees,
  Users,
  Video,
  Box,
  Edit3,
  FileSpreadsheet,
  Trash2,
  Zap,
} from 'lucide-react';
import { Agent, ScenarioConfig, ScenarioId, SpatialLayout, StepMetric } from '../../types/simulation';
import { Orthographic2DView } from './Orthographic2DView';
import { SelectedObjectInfo, ThreeUrbanScene, ThreeUrbanSceneRef } from './ThreeUrbanScene';

interface UrbanDigitalTwinViewProps {
  layout: SpatialLayout;
  agents: Agent[];
  config: ScenarioConfig;
  stepMetric: StepMetric | null;
  currentStep: number;
  isSimulating: boolean;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRunToCompletion: () => void;
  onScenarioChange: (id: ScenarioId) => void;
  onUpdateSpatialLayout?: (newLayout: SpatialLayout) => void;
  onNavigateTab?: (tab: any) => void;
  onOpenDetailedReport?: () => void;
}

export const UrbanDigitalTwinView: React.FC<UrbanDigitalTwinViewProps> = ({
  layout,
  agents,
  config,
  stepMetric,
  currentStep,
  isSimulating,
  simulationSpeed,
  onSpeedChange,
  onStart,
  onPause,
  onReset,
  onRunToCompletion,
  onScenarioChange,
  onUpdateSpatialLayout,
  onNavigateTab,
  onOpenDetailedReport,
}) => {
  // View mode: '2d' | '3d' | 'split'
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'split'>('split');
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage 50/50

  // Spatial analysis tool states
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [measurementResult, setMeasurementResult] = useState<string | null>(null);
  const [showProximityLines, setShowProximityLines] = useState<boolean>(true);
  const [showHeatmapDensity, setShowHeatmapDensity] = useState<boolean>(false);
  const [showStreetFlows, setShowStreetFlows] = useState<boolean>(true);
  const [scientificMode, setScientificMode] = useState<boolean>(false);

  // Inspector & Coordinates state
  const [selectedObject, setSelectedObject] = useState<SelectedObjectInfo | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  // Reference plan overlay state
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [planOpacity, setPlanOpacity] = useState<number>(0.35);
  const [metersPerPixel, setMetersPerPixel] = useState<number>(layout.metersPerPixel || 0.76);
  const [isExporting3D, setIsExporting3D] = useState<boolean>(false);

  // 3D OBJ Model Position & Alignment States
  const [show3dModelModal, setShow3dModelModal] = useState<boolean>(false);
  const [objScale, setObjScale] = useState<number>(2.2);
  const [objRotY, setObjRotY] = useState<number>(0);
  const [objPosX, setObjPosX] = useState<number>(0);
  const [objPosZ, setObjPosZ] = useState<number>(0);
  const [objPosY, setObjPosY] = useState<number>(0);
  const [showObjModel, setShowObjModel] = useState<boolean>(false);

  const threeRef = useRef<ThreeUrbanSceneRef>(null);

  // Handle measurement completion
  const handleMeasurementDone = (dist: number, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    setMeasurementResult(
      `Distance mesurée: ${dist.toFixed(2)} m entre (${p1.x}m, ${p1.y}m) et (${p2.x}m, ${p2.y}m)`
    );
  };

  // Handle free movement / displacement of selected object
  const handleMoveSelected = (dx: number, dy: number) => {
    if (!selectedObject || !onUpdateSpatialLayout) return;
    const { id, type } = selectedObject;
    if (type === 'building') {
      const updated = layout.buildings.map((b) =>
        b.id === id ? { ...b, x: Math.round(b.x + dx), y: Math.round(b.y + dy) } : b
      );
      onUpdateSpatialLayout({ ...layout, buildings: updated });
      const target = updated.find((b) => b.id === id);
      if (target) {
        setSelectedObject({
          ...selectedObject,
          position: { x: target.x, y: target.y, z: target.floors * 3.2 },
          details: {
            ...selectedObject.details,
            'Coordonnées UV9': `X: ${target.x}m, Y: ${target.y}m`,
          },
        });
      }
    } else if (type === 'furniture' && layout.urbanFurniture) {
      const updated = layout.urbanFurniture.map((f) =>
        f.id === id ? { ...f, x: Math.round(f.x + dx), y: Math.round(f.y + dy) } : f
      );
      onUpdateSpatialLayout({ ...layout, urbanFurniture: updated });
    }
  };

  // Handle free rotation of selected object
  const handleRotateSelected = (deltaDeg: number) => {
    if (!selectedObject || !onUpdateSpatialLayout || selectedObject.type !== 'building') return;
    const { id } = selectedObject;
    const updated = layout.buildings.map((b) =>
      b.id === id ? { ...b, rotation: ((b.rotation || 0) + deltaDeg + 360) % 360 } : b
    );
    onUpdateSpatialLayout({ ...layout, buildings: updated });
    const target = updated.find((b) => b.id === id);
    if (target) {
      setSelectedObject({
        ...selectedObject,
        details: {
          ...selectedObject.details,
          'Orientation / Rotation': `${target.rotation || 0}°`,
        },
      });
    }
  };

  // Handle height / floors adjustment
  const handleFloorsSelected = (deltaFloors: number) => {
    if (!selectedObject || !onUpdateSpatialLayout || selectedObject.type !== 'building') return;
    const { id } = selectedObject;
    const updated = layout.buildings.map((b) =>
      b.id === id ? { ...b, floors: Math.max(1, Math.min(20, b.floors + deltaFloors)) } : b
    );
    onUpdateSpatialLayout({ ...layout, buildings: updated });
    const target = updated.find((b) => b.id === id);
    if (target) {
      setSelectedObject({
        ...selectedObject,
        details: {
          ...selectedObject.details,
          'Niveaux / Hauteur': `R+${target.floors} (${(target.floors * 3.2).toFixed(1)}m)`,
          'Surface Plancher Totale': `${(target.width * target.height * target.floors).toLocaleString()} m²`,
        },
      });
    }
  };

  // Export handlers
  const handleExport3DGLTF = async () => {
    if (!threeRef.current) return;
    setIsExporting3D(true);
    try {
      await threeRef.current.exportGLTF(`Maquette_Numerique_UV9_AliMendjeli_Step${currentStep}.glb`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting3D(false);
    }
  };

  const handleExport2DSVG = () => {
    const svgEl = document.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `Plan_Masse_Orthographique_UV9_AliMendjeli.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const handleExportGeoJSON = () => {
    const features: any[] = [];
    // Buildings
    layout.buildings.forEach((b) => {
      features.push({
        type: 'Feature',
        properties: {
          id: b.id,
          name: b.name,
          floors: b.floors,
          heightMeters: b.floors * 3.2,
          rotation: b.rotation || 0,
          type: 'building',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [b.x, b.y],
              [b.x + b.width, b.y],
              [b.x + b.width, b.y + b.height],
              [b.x, b.y + b.height],
              [b.x, b.y],
            ],
          ],
        },
      });
    });

    // Blocks
    (layout.blocks || []).forEach((blk) => {
      features.push({
        type: 'Feature',
        properties: {
          id: blk.id,
          code: blk.code,
          name: blk.name,
          category: blk.category,
          type: 'urban_block',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [blk.polygon.map((p) => [p.x, p.y])],
        },
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      name: 'UV9_Ali_Mendjeli_Urban_Model',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features,
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cadastre_UV9_AliMendjeli.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Parametres_Site_UV9_AliMendjeli.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle 3D screenshot export
  const handleExportScreenshot = () => {
    const dataUrl = threeRef.current?.captureScreenshot();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `UrbanResilience_DigitalTwin_Step${currentStep}_${config.id}.png`;
    a.click();
  };

  // Agent counts
  const countS = agents.filter((a) => a.state === 'S').length;
  const countI = agents.filter((a) => a.state === 'I').length;
  const countR = agents.filter((a) => a.state === 'R').length;

  const handleDeleteSelectedFromTwin = () => {
    if (!selectedObject || !onUpdateSpatialLayout) return;
    const { id, type } = selectedObject;
    const newLayout: SpatialLayout = {
      ...layout,
      buildings: type === 'building' ? layout.buildings.filter((b) => b.id !== id) : layout.buildings,
      vegetationZones: (type === 'tree' || (type as string) === 'vegetation') ? layout.vegetationZones.filter((v) => v.id !== id) : layout.vegetationZones,
      urbanFurniture: type === 'furniture' ? (layout.urbanFurniture || []).filter((f) => f.id !== id) : layout.urbanFurniture,
    };
    onUpdateSpatialLayout(newLayout);
    setSelectedObject(null);
  };

  // Keyboard shortcut Suppr / Backspace in Digital Twin
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject && onUpdateSpatialLayout) {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        handleDeleteSelectedFromTwin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, layout, onUpdateSpatialLayout]);

  const clockTime = currentStep >= 540 ? '18:00' : stepMetric?.clockTime || '09:00';

  return (
    <div className="space-y-4">
      {/* 1. Master Header & Spec Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <h1 className="text-base font-bold text-white tracking-tight">Urban Digital Twin</h1>
              <span className="text-slate-500">·</span>
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                UV9 Ali Mendjeli — 500m × 400m
              </span>
            </div>
            <p className="text-xs text-amber-300/90 font-medium mt-1">
              ⚠️ Modèle illustratif, géométrie non géoréférencée — Dimensions métriques calibrées (seuil contact: 2.0m)
            </p>
          </div>

          {/* Quick Scenario Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Scénario actif:</span>
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              {(['S0', 'S1', 'S2', 'S3', 'S4'] as ScenarioId[]).map((scId) => (
                <button
                  key={scId}
                  onClick={() => onScenarioChange(scId)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                    config.id === scId
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {scId}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Mode & Camera Presets Toolbar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition ${
                viewMode === '2d' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vue 2D Ortho
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition ${
                viewMode === '3d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Vue 3D Immersive
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition ${
                viewMode === 'split' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Écran Partagé 2D/3D
            </button>
          </div>

          {/* 3D Camera Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-xs font-medium">Caméra 3D:</span>
            <button
              onClick={() => threeRef.current?.setCameraPreset('isometric')}
              className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-700"
              title="Perspective Isométrique 45°"
            >
              Isométrique
            </button>
            <button
              onClick={() => threeRef.current?.setCameraPreset('topDown')}
              className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-700"
              title="Vue Aérienne Zénithale"
            >
              Vue Aérienne
            </button>
            <button
              onClick={() => threeRef.current?.setCameraPreset('pedestrian')}
              className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-700"
              title="Niveau Piéton (1.75m)"
            >
              Niveau Rue
            </button>
            <button
              onClick={() => threeRef.current?.setCameraPreset('baseChinoise')}
              className="px-2 py-1 bg-amber-950/80 text-amber-300 hover:text-white rounded border border-amber-700 hover:bg-amber-900"
              title="Focus sur la Base de Vie Chinoise"
            >
              Base Chinoise
            </button>
            <button
              onClick={() => threeRef.current?.setCameraPreset('ecole')}
              className="px-2 py-1 bg-sky-950/80 text-sky-300 hover:text-white rounded border border-sky-700 hover:bg-sky-900"
              title="Focus sur l'École Bousherit & Belehreche"
            >
              École Bousherit
            </button>
            <button
              onClick={() => threeRef.current?.setCameraPreset('mosque')}
              className="px-2 py-1 bg-emerald-950/80 text-emerald-300 hover:text-white rounded border border-emerald-700 hover:bg-emerald-900"
              title="Focus sur la Grande Mosquée & l'Hôtel"
            >
              Mosquée & Hôtel
            </button>
            <button
              onClick={() => threeRef.current?.setCameraPreset('market')}
              className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-700"
              title="Zoom sur le Marché"
            >
              Marché
            </button>
            <button
              onClick={() => threeRef.current?.resetCamera()}
              className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700"
              title="Réinitialiser caméra"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Spatial Tools: Ruler, Proximity, Heatmap, Screenshot, Export Suite */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMeasuring(!isMeasuring)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border font-medium transition ${
                isMeasuring
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Cliquer 2 points sur la carte pour mesurer la distance réelle"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>{isMeasuring ? 'Règle Active' : 'Règle métrique'}</span>
            </button>

            <button
              onClick={() => setShowProximityLines(!showProximityLines)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border font-medium transition ${
                showProximityLines
                  ? 'bg-rose-900/60 text-rose-300 border-rose-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Afficher les contacts à moins de 2 mètres"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Rayons &lt;2m</span>
            </button>

            <button
              onClick={() => setScientificMode(!scientificMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border font-medium transition ${
                scientificMode
                  ? 'bg-purple-900/60 text-purple-300 border-purple-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Mode scientifique léger (silhouettes/sphères sans modèles détaillés)"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Mode Léger</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded border border-indigo-600 bg-indigo-950/90 text-indigo-200 hover:bg-indigo-900 font-bold transition shadow-xs"
              title="Exporter la maquette numérique (3D GLB/GLTF, 2D SVG, GeoJSON, JSON)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Exportations (3D/2D/SIG)</span>
            </button>

            <button
              onClick={() => setShow3dModelModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-indigo-700/60 bg-indigo-950/80 text-indigo-200 hover:bg-indigo-900"
              title="Ajuster la position, échelle et rotation du modèle 3D importé (.OBJ)"
            >
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              <span>Position 3D OBJ</span>
            </button>

            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              title="Importer un plan DAO/SIG de référence"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Plan DAO</span>
            </button>

            <button
              onClick={handleExportScreenshot}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              title="Exporter capture PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Capture PNG</span>
            </button>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('siteModeling')}
                className="flex items-center gap-1.5 px-3 py-1 rounded border border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-sm hover:from-emerald-500 hover:to-teal-500 transition"
                title="Ouvrir l'Atelier 2D/3D pour dessiner des ruelles, ajouter ou supprimer des objets et générer depuis un plan"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Atelier Conception 2D/3D</span>
              </button>
            )}

            {onOpenDetailedReport && (
              <button
                onClick={onOpenDetailedReport}
                className="flex items-center gap-1.5 px-3 py-1 rounded border border-indigo-600 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-sm hover:from-indigo-500 hover:to-blue-500 transition"
                title="Générer et consulter le rapport scientifique détaillé de résilience urbaine"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-200" />
                <span>📑 Rapport Détaillé</span>
              </button>
            )}
          </div>
        </div>

        {/* Measurement banner feedback */}
        {measurementResult && (
          <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-200 text-xs flex items-center justify-between">
            <span className="font-mono">{measurementResult}</span>
            <button
              onClick={() => setMeasurementResult(null)}
              className="text-amber-400 hover:text-white text-xs underline font-sans ml-4"
            >
              Effacer
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Viewport Canvas (2D / 3D / Split-Screen) with Property Inspector */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[560px]">
        {/* Left/Main Viewport Area */}
        <div className={`${isInspectorOpen && selectedObject ? 'lg:col-span-9' : 'lg:col-span-12'} transition-all`}>
          <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[560px]">
            {/* Split Screen Mode */}
            {viewMode === 'split' && (
              <div className="flex h-full w-full divide-x divide-slate-800">
                {/* 2D Half */}
                <div className="w-1/2 h-full relative">
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-xs font-bold text-cyan-400">
                    Cité – Vue 2D (Îlots, Ruelles, Bâtiments)
                  </div>
                  <Orthographic2DView
                    layout={layout}
                    agents={agents}
                    config={config}
                    stepMetric={stepMetric}
                    measurementMode={isMeasuring}
                    onMeasurementDone={handleMeasurementDone}
                    onSelectObject={setSelectedObject}
                    showProximityLines={showProximityLines}
                    showHeatmapDensity={showHeatmapDensity}
                    showStreetFlows={showStreetFlows}
                    onHoverCoords={setHoverCoords}
                    referencePlanOpacity={planOpacity}
                    referencePlanUrl={planUrl}
                  />
                </div>

                {/* 3D Half */}
                <div className="w-1/2 h-full relative">
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-xs font-bold text-indigo-400">
                    Cité – Vue 3D Three.js PBR (Ombres, Hauteurs, Arbres)
                  </div>
                  <ThreeUrbanScene
                    ref={threeRef}
                    layout={layout}
                    agents={agents}
                    config={config}
                    stepMetric={stepMetric}
                    scientificMode={scientificMode}
                    measurementMode={isMeasuring}
                    onMeasurementDone={handleMeasurementDone}
                    onSelectObject={setSelectedObject}
                    showProximityLines={showProximityLines}
                    showHeatmapDensity={showHeatmapDensity}
                    onHoverCoords={setHoverCoords}
                    objModelScale={objScale}
                    objModelRotY={objRotY}
                    objModelPosX={objPosX}
                    objModelPosZ={objPosZ}
                    objModelPosY={objPosY}
                    showObjModel={showObjModel}
                  />
                </div>
              </div>
            )}

            {/* 2D Only Mode */}
            {viewMode === '2d' && (
              <div className="w-full h-full relative">
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-xs font-bold text-cyan-400">
                  Cité – Vue 2D Orthographique (Plan Masse Réel)
                </div>
                <Orthographic2DView
                  layout={layout}
                  agents={agents}
                  config={config}
                  stepMetric={stepMetric}
                  measurementMode={isMeasuring}
                  onMeasurementDone={handleMeasurementDone}
                  onSelectObject={setSelectedObject}
                  showProximityLines={showProximityLines}
                  showHeatmapDensity={showHeatmapDensity}
                  showStreetFlows={showStreetFlows}
                  onHoverCoords={setHoverCoords}
                  referencePlanOpacity={planOpacity}
                  referencePlanUrl={planUrl}
                />
              </div>
            )}

            {/* 3D Only Mode */}
            {viewMode === '3d' && (
              <div className="w-full h-full relative">
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-xs font-bold text-indigo-400">
                  Vue 3D Immersive PBR — Ali Mendjeli
                </div>
                <ThreeUrbanScene
                  ref={threeRef}
                  layout={layout}
                  agents={agents}
                  config={config}
                  stepMetric={stepMetric}
                  scientificMode={scientificMode}
                  measurementMode={isMeasuring}
                  onMeasurementDone={handleMeasurementDone}
                  onSelectObject={setSelectedObject}
                  showProximityLines={showProximityLines}
                  showHeatmapDensity={showHeatmapDensity}
                  onHoverCoords={setHoverCoords}
                  objModelScale={objScale}
                  objModelRotY={objRotY}
                  objModelPosX={objPosX}
                  objModelPosZ={objPosZ}
                  objModelPosY={objPosY}
                  showObjModel={showObjModel}
                />
              </div>
            )}

            {/* Overlay HUD Coordinates & Scale bar at bottom-left */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-xs shadow-lg">
              <span className="text-slate-400">Coordonnées:</span>
              <span className="text-emerald-400 font-bold">
                {hoverCoords
                  ? `X: ${hoverCoords.x}m (${Math.round(hoverCoords.x / metersPerPixel)}px) · Y: ${hoverCoords.y}m (${Math.round(hoverCoords.y / metersPerPixel)}px)`
                  : 'Survoler le quartier...'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Calibrage:</span>
              <span className="text-amber-400 font-bold">{metersPerPixel.toFixed(2)} m/px</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Échelle:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1.5 bg-emerald-500 rounded-xs" />
                <span className="text-slate-200">50m</span>
              </div>
            </div>

            {/* Overlay Legend at top-right */}
            <div className="absolute top-3 right-3 z-20 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs space-y-1.5 backdrop-blur-xs max-w-xs shadow-lg">
              <div className="font-semibold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>Légende Spatiale</span>
                <span className="text-slate-500 font-mono text-[10px]">{agents.length} piétons</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-slate-300">Sain (S): {countS}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-300">Infecté (I): {countI}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-slate-300">Rétabli (R): {countR}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                  <span className="text-slate-300">Arbres & Ombres</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                  <span className="text-slate-300">Étal de marché</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" />
                  <span className="text-slate-300">Portes d'accès</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Property Inspector */}
        {isInspectorOpen && selectedObject && (
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Inspecteur d'Objet</h3>
              </div>
              <button
                onClick={() => setSelectedObject(null)}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-xs font-semibold text-white">{selectedObject.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {selectedObject.id}</div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
              {Object.entries(selectedObject.details).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">{key}:</span>
                  <span className="text-slate-200 font-semibold text-right font-mono">{String(val)}</span>
                </div>
              ))}
            </div>

            {selectedObject.position && (
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Position Métrique UV9:</div>
                <div className="text-emerald-400">
                  X = {selectedObject.position.x.toFixed(1)} m · Y = {selectedObject.position.y.toFixed(1)} m
                  {selectedObject.position.z !== undefined && ` · Z = ${selectedObject.position.z.toFixed(1)} m`}
                </div>
              </div>
            )}

            {/* Direct Free Manipulation Pad (Translation, Rotation, Floors) */}
            {onUpdateSpatialLayout && selectedObject.type === 'building' && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <span>Disposition & Géométrie</span>
                </div>

                {/* Translation X / Y */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400">Déplacement Libre (X / Y):</div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => handleMoveSelected(-2, 0)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                      title="Déplacer vers l'Ouest (-2m)"
                    >
                      ← 2m
                    </button>
                    <button
                      onClick={() => handleMoveSelected(2, 0)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                      title="Déplacer vers l'Est (+2m)"
                    >
                      → 2m
                    </button>
                    <button
                      onClick={() => handleMoveSelected(0, -2)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                      title="Déplacer vers le Nord (-2m)"
                    >
                      ↑ 2m
                    </button>
                    <button
                      onClick={() => handleMoveSelected(0, 2)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                      title="Déplacer vers le Sud (+2m)"
                    >
                      ↓ 2m
                    </button>
                  </div>
                </div>

                {/* Rotation & Floors */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1">Rotation d'angle:</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRotateSelected(-15)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Tourner de -15°"
                      >
                        ↺ -15°
                      </button>
                      <button
                        onClick={() => handleRotateSelected(15)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Tourner de +15°"
                      >
                        ↻ +15°
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 mb-1">Hauteur / Étages:</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleFloorsSelected(-1)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Diminuer d'un étage (-1)"
                      >
                        -1 ét.
                      </button>
                      <button
                        onClick={() => handleFloorsSelected(1)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Augmenter d'un étage (+1)"
                      >
                        +1 ét.
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions: Delete from digital twin or Edit in atelier */}
            {onUpdateSpatialLayout && ['building', 'street', 'tree', 'furniture'].includes(selectedObject.type) && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={handleDeleteSelectedFromTwin}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                  title="Supprimer cet objet de la maquette (Touche Suppr)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer de la Maquette [Suppr]</span>
                </button>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('siteModeling')}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Concevoir / Modifier dans l'Atelier</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Collapsible Ergonomic Bottom Dock (Zero Viewport Occlusion) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Barre Temporelle & Moteur de Simulation
                </h3>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">{clockTime}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pas temporel {currentStep} / 540 (1 pas = 1 min, de 09:00 à 18:00)
              </p>
            </div>
          </div>

          {/* Dock Collapse Toggle */}
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700"
          >
            {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isDockCollapsed ? 'Déplier Contrôles' : 'Replier Contrôles'}</span>
          </button>
        </div>

        {!isDockCollapsed && (
          <div className="mt-3 space-y-3">
            {/* Timeline Progress Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>09:00 (Pas 0)</span>
                <span className="text-white font-bold">{clockTime} ({currentStep}/540)</span>
                <span>18:00 (Pas 540)</span>
              </div>
              <input
                type="range"
                min="0"
                max="540"
                value={currentStep}
                readOnly
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Playback Controls & Speed */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                {isSimulating ? (
                  <button
                    onClick={onPause}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-md transition"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={onStart}
                    disabled={currentStep >= 540}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-lg shadow-md transition"
                  >
                    <Play className="w-4 h-4" />
                    <span>Démarrer</span>
                  </button>
                )}

                <button
                  onClick={onReset}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                  title="Réinitialiser la simulation à 09:00"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>

                <button
                  onClick={onRunToCompletion}
                  disabled={currentStep >= 540}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded-lg shadow-md transition"
                  title="Calculer instantanément les 540 pas (09:00 -> 18:00)"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Fin de journée (540 pas)</span>
                </button>

                {onOpenDetailedReport && (
                  <button
                    onClick={onOpenDetailedReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-md transition ring-1 ring-emerald-400/40"
                    title="Générer et afficher le rapport d'analyse urbaine détaillé avec courbes, points chauds et recommandations"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                    <span>📑 Rapport Détaillé</span>
                  </button>
                )}
              </div>

              {/* Simulation Speed Pill Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-xs px-1.5">Vitesse:</span>
                {[1, 5, 20].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onSpeedChange(spd)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold font-mono transition ${
                      simulationSpeed === spd
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Live Scientific Metric Counters (OCCSIM Standards) */}
              <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs flex-wrap">
                <div>
                  <span className="text-slate-400 text-[10px] block">Taux d'Infection (Sick %):</span>
                  <span className="text-rose-400 font-bold text-sm">
                    {stepMetric ? `${stepMetric.infectiousPercentage.toFixed(1)}%` : '0.0%'}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Cycle Journalier (Heures de pointe):</span>
                  {stepMetric?.peakHourActive ? (
                    <span className="text-amber-300 font-bold bg-amber-950/80 border border-amber-700/60 px-1.5 py-0.5 rounded text-[11px] animate-pulse">
                      🔥 {stepMetric.peakHourActive} (Flux x{stepMetric.flowSurgeFactor})
                    </span>
                  ) : (
                    <span className="text-slate-300 font-medium text-[11px]">
                      Flux nominal (09h - 18h)
                    </span>
                  )}
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Contacts &lt;2.0m / &lt;1.0m / &lt;0.25m:</span>
                  <span className="text-amber-400 font-bold">
                    {stepMetric?.contactsUnder2m ?? stepMetric?.proximityContacts ?? 0}
                    <span className="text-slate-500 font-normal"> / </span>
                    <span className="text-orange-400">{stepMetric?.contactsUnder1m ?? 0}</span>
                    <span className="text-slate-500 font-normal"> / </span>
                    <span className="text-rose-500">{stepMetric?.contactsUnder025m ?? 0}</span>
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Vecteurs (Aérosol / Fomite):</span>
                  <span className="text-slate-200 font-bold">
                    <span className="text-cyan-400">💨 {stepMetric?.airTransmissions ?? 0}</span>
                    <span className="text-slate-600"> · </span>
                    <span className="text-purple-400">🖐️ {stepMetric?.surfaceTransmissions ?? 0}</span>
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 text-[10px] block">ENVI-met (T° / RH / Vent):</span>
                  <span className="text-emerald-400 font-bold">
                    {stepMetric
                      ? `${stepMetric.temperature.toFixed(1)}°C · ${stepMetric.relativeHumidity.toFixed(0)}% · ${stepMetric.windSpeed.toFixed(2)} m/s`
                      : '32.5°C · 50% · 3.20 m/s'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Plan DAO Reference Calibration Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Import & Calibration de Plan de Référence (DAO/SIG)</h3>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Superposez un plan d'architecte ou une vue satellite géoréférencée pour vérifier la disposition spatiale des îlots de l'UV9 Ali Mendjeli.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">URL de l'image de plan (JPG/PNG/SVG):</label>
                <input
                  type="text"
                  placeholder="https://exemple.org/plan_masse_uv9.png"
                  value={planUrl || ''}
                  onChange={(e) => setPlanUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Opacité du calque:</span>
                  <span className="font-mono text-white">{Math.round(planOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.9"
                  step="0.05"
                  value={planOpacity}
                  onChange={(e) => setPlanOpacity(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-300">Calibration d'échelle:</div>
                <div className="text-slate-400 text-[11px]">
                  Largeur terrain: <span className="text-emerald-400 font-bold">500.0 m</span> · Hauteur terrain: <span className="text-emerald-400 font-bold">400.0 m</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Ratio d'aspect: 5:4 (1.25). L'image importée est étirée à l'échelle du rectangle morphologique.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPlanUrl(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded text-xs"
              >
                Retirer le calque
              </button>
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 3D OBJ Model Calibration & Alignment Modal */}
      {show3dModelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Ajustement du Modèle 3D Importé (.OBJ / .MTL)</h3>
              </div>
              <button
                onClick={() => setShow3dModelModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ajustez l'échelle, la rotation et la position sur le terrain pour caler exactement la maquette 3D sur le site.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="font-semibold text-white">Afficher la Maquette 3D (.OBJ)</span>
                <input
                  type="checkbox"
                  checked={showObjModel}
                  onChange={(e) => setShowObjModel(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Échelle 3D:</span>
                  <span className="font-mono text-indigo-400 font-bold">{objScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={objScale}
                  onChange={(e) => setObjScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Rotation d'Azimut Y:</span>
                  <span className="font-mono text-sky-400 font-bold">{objRotY}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={objRotY}
                  onChange={(e) => setObjRotY(parseInt(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Position X:</span>
                    <span className="font-mono text-slate-200">{objPosX}m</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    value={objPosX}
                    onChange={(e) => setObjPosX(parseInt(e.target.value))}
                    className="w-full accent-slate-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Position Z:</span>
                    <span className="font-mono text-slate-200">{objPosZ}m</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    value={objPosZ}
                    onChange={(e) => setObjPosZ(parseInt(e.target.value))}
                    className="w-full accent-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Élévation / Altitude Y:</span>
                  <span className="font-mono text-amber-400">{objPosY}m</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="0.5"
                  value={objPosY}
                  onChange={(e) => setObjPosY(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => {
                  setObjScale(2.2);
                  setObjRotY(0);
                  setObjPosX(0);
                  setObjPosZ(0);
                  setObjPosY(0);
                }}
                className="text-slate-400 hover:text-white underline font-mono"
              >
                Réinitialiser
              </button>

              <button
                onClick={() => setShow3dModelModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Complete Export Suite Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-xl w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Exportations de la Maquette Numérique UV9</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Téléchargez la géométrie urbaine, le cadastre et les paramètres de simulation dans les formats standards d'urbanisme, de CAO/DAO et de SIG.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* 3D GLTF / GLB */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-indigo-400" />
                    <span>Maquette 3D (.GLB / .GLTF)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Export binaire Three.js complet (bâtiments extrudés, îlots, ruelles, textures PBR) compatible Blender, AutoCAD, ArcGIS Urban, Unity.
                  </p>
                </div>
                <button
                  onClick={handleExport3DGLTF}
                  disabled={isExporting3D}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting3D ? 'Exportation 3D en cours...' : 'Télécharger .GLB 3D'}</span>
                </button>
              </div>

              {/* 2D SVG Vector */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Plan Masse Vectoriel (.SVG)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Plan orthographique 2D vectoriel haute fidélité (îlots, ruelles, parcelles, lettrages) exploitable dans Illustrator, Inkscape ou QGIS.
                  </p>
                </div>
                <button
                  onClick={handleExport2DSVG}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger .SVG 2D</span>
                </button>
              </div>

              {/* GeoJSON RFC 7946 */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Cadastre SIG (.GeoJSON)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Polygones d'emprises au sol, îlots et parcelles avec attributs complets (niveaux, hauteurs, typologies) pour SIG / QGIS.
                  </p>
                </div>
                <button
                  onClick={handleExportGeoJSON}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger .GeoJSON</span>
                </button>
              </div>

              {/* Site JSON Parameters */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Configuration Complète (.JSON)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sauvegarde JSON intégrale de la disposition spatiale, des équipements, de la végétation et des ruelles piétonnes.
                  </p>
                </div>
                <button
                  onClick={handleExportJSON}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger .JSON</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
              {onOpenDetailedReport && (
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    onOpenDetailedReport();
                  }}
                  className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 rounded font-semibold border border-indigo-700/60 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ouvrir Rapport Scientifique PDF</span>
                </button>
              )}
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
