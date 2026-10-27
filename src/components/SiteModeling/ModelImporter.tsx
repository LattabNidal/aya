/**
 * ModelImporter Component — 3D Asset Loader & Placeholder Replacement Tool
 * Handles local file selection for GLB, GLTF, and OBJ models.
 * Features an interactive Three.js 3D viewport, automatic bounding box scaling,
 * and a "Replace" option to swap generic architectural placeholders with user-provided assets.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import {
  Box,
  CheckCircle2,
  ChevronRight,
  Compass,
  Download,
  Eye,
  FileCode,
  FolderOpen,
  Layers,
  Move,
  RefreshCw,
  RotateCw,
  Ruler,
  Save,
  Sliders,
  Sparkles,
  ArrowDownUp,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { Building, SpatialLayout } from '../../types/simulation';

interface ModelImporterProps {
  layout: SpatialLayout;
  onUpdateSpatialLayout: (newLayout: SpatialLayout) => void;
  onNavigateTab?: (tab: string) => void;
}

export interface ImportedModelInfo {
  fileName: string;
  fileSize: string;
  format: 'GLB' | 'glTF' | 'OBJ';
  vertexCount: number;
  faceCount: number;
  dimensionsMeters: { x: number; y: number; z: number }; // width, height, depth
  blobUrl: string;
}

export const ModelImporter: React.FC<ModelImporterProps> = ({
  layout,
  onUpdateSpatialLayout,
  onNavigateTab,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // File & Model state
  const [modelInfo, setModelInfo] = useState<ImportedModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scale & Orientation Controls
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0);
  const [rotationAngleY, setRotationAngleY] = useState<number>(0);
  const [estimatedFloors, setEstimatedFloors] = useState<number>(5);

  // Replace Target Building State
  const [targetBuildingId, setTargetBuildingId] = useState<string>(
    layout.buildings[0]?.id || ''
  );
  const [replaceSuccessMessage, setReplaceSuccessMessage] = useState<string | null>(null);

  // Handle Local File Selection (.glb, .gltf, .obj)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

    if (!['glb', 'gltf', 'obj'].includes(ext || '')) {
      setErrorMessage("Format non supporté. Veuillez sélectionner un fichier .glb, .gltf ou .obj.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setReplaceSuccessMessage(null);

    const blobUrl = URL.createObjectURL(file);
    const format = ext === 'obj' ? 'OBJ' : ext === 'gltf' ? 'glTF' : 'GLB';

    // Load into Three.js Preview Canvas
    loadModelIntoPreview(blobUrl, format, name, `${sizeMb} MB`);
  };

  // Load Model into Three.js Preview Viewport
  const loadModelIntoPreview = (
    url: string,
    format: 'GLB' | 'glTF' | 'OBJ',
    fileName: string,
    fileSize: string
  ) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous model group
    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      modelGroupRef.current = null;
    }

    const newGroup = new THREE.Group();
    newGroup.name = 'PreviewUser3DModel';

    const onModelReady = (object3d: THREE.Object3D) => {
      newGroup.add(object3d);

      // Compute bounding box and exact dimensions
      const bbox = new THREE.Box3().setFromObject(newGroup);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      // Center model at origin and ground surface (Y = 0)
      object3d.position.x = -center.x;
      object3d.position.z = -center.z;
      object3d.position.y = -bbox.min.y;

      // Count vertices and faces
      let vCount = 0;
      let fCount = 0;
      object3d.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.geometry) {
            vCount += mesh.geometry.attributes.position?.count || 0;
            if (mesh.geometry.index) {
              fCount += mesh.geometry.index.count / 3;
            }
          }
        }
      });

      scene.add(newGroup);
      modelGroupRef.current = newGroup;

      // Fit camera to model size
      const maxDim = Math.max(size.x, size.y, size.z, 5);
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.8);
        controlsRef.current.target.set(0, size.y / 2, 0);
        controlsRef.current.update();
      }

      const dims = {
        x: parseFloat(size.x.toFixed(1)),
        y: parseFloat(size.y.toFixed(1)),
        z: parseFloat(size.z.toFixed(1)),
      };

      const floors = Math.max(1, Math.round(dims.y / 3.2));
      setEstimatedFloors(floors);

      setModelInfo({
        fileName,
        fileSize,
        format,
        vertexCount: vCount,
        faceCount: Math.round(fCount),
        dimensionsMeters: dims,
        blobUrl: url,
      });

      setIsLoading(false);
    };

    if (format === 'OBJ') {
      const objLoader = new OBJLoader();
      objLoader.load(
        url,
        (obj) => onModelReady(obj),
        undefined,
        (err) => {
          console.error('OBJ preview error:', err);
          setIsLoading(false);
          setErrorMessage("Erreur lors du chargement du fichier .OBJ.");
        }
      );
    } else {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        url,
        (gltf) => onModelReady(gltf.scene),
        undefined,
        (err) => {
          console.error('GLTF/GLB preview error:', err);
          setIsLoading(false);
          setErrorMessage("Erreur lors du chargement du fichier .GLB/.GLTF.");
        }
      );
    }
  };

  // Initialize Three.js Preview Canvas
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 350;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(25, 20, 30);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 50, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Ground Grid Helper
    const grid = new THREE.GridHelper(100, 20, 0x10b981, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Live update 3D model transforms in preview
  useEffect(() => {
    if (modelGroupRef.current) {
      modelGroupRef.current.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
      modelGroupRef.current.rotation.y = (rotationAngleY * Math.PI) / 180;
    }
  }, [scaleMultiplier, rotationAngleY]);

  // SWAP / REPLACE generic building placeholder with user-provided 3D model asset
  const handleReplacePlaceholder = () => {
    if (!modelInfo) return;

    const target = layout.buildings.find((b) => b.id === targetBuildingId);
    if (!target) return;

    const scaledWidth = Math.round(modelInfo.dimensionsMeters.x * scaleMultiplier);
    const scaledHeight = Math.round(modelInfo.dimensionsMeters.z * scaleMultiplier); // depth becomes height in 2D topdown

    const updatedBuildings = layout.buildings.map((bld) => {
      if (bld.id === targetBuildingId) {
        return {
          ...bld,
          name: `${modelInfo.fileName.split('.')[0]} (R+${estimatedFloors})`,
          width: Math.max(15, scaledWidth),
          height: Math.max(15, scaledHeight),
          floors: estimatedFloors,
        };
      }
      return bld;
    });

    const updatedLayout: SpatialLayout = {
      ...layout,
      buildings: updatedBuildings,
      note: `Remplacement de l'îlot ${target.name} par le modèle 3D sur-mesure "${modelInfo.fileName}"`,
    };

    onUpdateSpatialLayout(updatedLayout);
    setReplaceSuccessMessage(
      `✓ L'îlot "${target.name}" a été remplacé avec succès par votre modèle 3D "${modelInfo.fileName}" !`
    );
  };

  // Add as new building block to spatial layout
  const handleAddNewBuilding = () => {
    if (!modelInfo) return;

    const scaledWidth = Math.round(modelInfo.dimensionsMeters.x * scaleMultiplier);
    const scaledHeight = Math.round(modelInfo.dimensionsMeters.z * scaleMultiplier);

    const newBuilding: Building = {
      id: `bld_user_asset_${Date.now().toString().slice(-4)}`,
      name: `${modelInfo.fileName.split('.')[0]} (R+${estimatedFloors})`,
      x: 220,
      y: 180,
      width: Math.max(15, scaledWidth),
      height: Math.max(15, scaledHeight),
      floors: estimatedFloors,
    };

    const updatedLayout: SpatialLayout = {
      ...layout,
      buildings: [...layout.buildings, newBuilding],
      note: `Ajout du nouveau bâtiment 3D "${modelInfo.fileName}" sur le site UV9`,
    };

    onUpdateSpatialLayout(updatedLayout);
    setReplaceSuccessMessage(
      `✓ Le bâtiment 3D "${modelInfo.fileName}" a été ajouté sur le site UV9 !`
    );
  };

  const selectedTargetBuilding = layout.buildings.find((b) => b.id === targetBuildingId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shadow-md">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              ModelImporter — Importation & Remplacement Bâtiment 3D
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chargez vos modèles GLB, GLTF ou OBJ locaux et remplacez les îlots génériques par vos propres maquettes
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('digitalTwin')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-md transition"
          >
            <Eye className="w-4 h-4" />
            <span>Voir dans Jumeau Numérique</span>
          </button>
        )}
      </div>

      {/* Main Grid: Upload & Viewport vs Replacement Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Dropzone & Three.js Interactive Preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Dropzone / Selection Box */}
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950 rounded-xl p-5 text-center transition cursor-pointer relative group shadow-inner">
            <Upload className="w-8 h-8 text-indigo-400 mx-auto group-hover:scale-110 transition-transform" />
            <div className="mt-2 space-y-1">
              <span className="text-xs font-bold text-white block">
                Sélectionnez un modèle 3D local (.GLB, .GLTF, .OBJ)
              </span>
              <span className="text-[11px] text-slate-400">
                Support des maillages architecturaux SketchUp, Blender, AutoCAD et Revit
              </span>
            </div>
            <input
              type="file"
              accept=".glb,.gltf,.obj"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <span className="font-bold">Erreur:</span> {errorMessage}
            </div>
          )}

          {/* Three.js 3D Preview Viewport */}
          <div className="relative w-full h-[360px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            <div ref={mountRef} className="w-full h-full" />

            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs font-bold text-white">Analyse et chargement du modèle 3D...</span>
              </div>
            )}

            {!modelInfo && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 pointer-events-none">
                <Box className="w-12 h-12 stroke-[1.2] text-slate-700 mb-2" />
                <span className="text-xs font-semibold text-slate-400">Aucun modèle 3D chargé</span>
                <span className="text-[11px] text-slate-600 mt-1">
                  Importez un fichier .GLB ou .OBJ ci-dessus pour prévisualiser sa géométrie en 3D
                </span>
              </div>
            )}

            {modelInfo && (
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono space-y-0.5 shadow-lg backdrop-blur-xs">
                <div className="font-bold text-indigo-300 truncate max-w-[200px]">{modelInfo.fileName}</div>
                <div className="text-[10px] text-slate-400">
                  {modelInfo.format} · {modelInfo.fileSize} · {modelInfo.vertexCount.toLocaleString()} sommets
                </div>
              </div>
            )}

            {modelInfo && (
              <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 shadow-lg">
                Dimensions 3D: {modelInfo.dimensionsMeters.x}m × {modelInfo.dimensionsMeters.y}m × {modelInfo.dimensionsMeters.z}m
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scale, Orientation & Replacement Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
            <div className="font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Réglages d'Échelle & Élévation</span>
              </span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-800">
                Trois.js PBR
              </span>
            </div>

            {/* Scale Multiplier Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Multiplicateur d'Échelle (Taille 3D):</span>
                <span className="font-mono text-indigo-400 font-bold">{scaleMultiplier.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.05"
                value={scaleMultiplier}
                onChange={(e) => setScaleMultiplier(parseFloat(e.target.value))}
                disabled={!modelInfo}
                className="w-full accent-indigo-500 disabled:opacity-40"
              />
            </div>

            {/* Rotation Y Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Rotation d'Azimut (Orientation Y):</span>
                <span className="font-mono text-sky-400 font-bold">{rotationAngleY}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={rotationAngleY}
                onChange={(e) => setRotationAngleY(parseInt(e.target.value))}
                disabled={!modelInfo}
                className="w-full accent-sky-500 disabled:opacity-40"
              />
            </div>

            {/* Floor Count Estimator */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Nombre d'Étages Estimé (Niveaux R+X):</span>
                <span className="font-mono text-amber-400 font-bold">R+{estimatedFloors}</span>
              </div>
              <input
                type="number"
                min="1"
                max="25"
                value={estimatedFloors}
                onChange={(e) => setEstimatedFloors(parseInt(e.target.value) || 1)}
                disabled={!modelInfo}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Replacement Action Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
            <div className="font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Remplacer un Îlot Générique</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">UV9 Site</span>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-300 font-medium">Sélectionner l'îlot à remplacer:</label>
              <select
                value={targetBuildingId}
                onChange={(e) => setTargetBuildingId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-semibold text-xs focus:outline-none focus:border-indigo-500"
              >
                {layout.buildings.map((bld) => (
                  <option key={bld.id} value={bld.id}>
                    {bld.name} ({bld.width}m × {bld.height}m)
                  </option>
                ))}
              </select>

              {selectedTargetBuilding && (
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>Emprise actuelle: {selectedTargetBuilding.width}m × {selectedTargetBuilding.height}m (R+{selectedTargetBuilding.floors})</div>
                  <div>Coordonnées site: X={selectedTargetBuilding.x}m, Y={selectedTargetBuilding.y}m</div>
                </div>
              )}
            </div>

            {replaceSuccessMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{replaceSuccessMessage}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleReplacePlaceholder}
                disabled={!modelInfo}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg text-xs shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Remplacer Îlot</span>
              </button>

              <button
                onClick={handleAddNewBuilding}
                disabled={!modelInfo}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700 transition"
                title="Ajouter comme nouveau bâtiment séparé"
              >
                + Ajouter Nouveau
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
