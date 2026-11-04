/**
 * 3D Urban Digital Twin Scene — Three.js Engine
 * Faithfully integrates the Cite3D architectural model:
 * - 7 Îlots (extruded green lawns with raised curbs)
 * - 7 Ruelles piétonnes (beige paving)
 * - 47 Immeubles (briques/blancs/gris avec arêtes foncées et hauteurs d'étages)
 * - 6 Jardins paysagers (haies et fleurs)
 * - 260 Arbres instanciés
 * - Grande Mosquée avec dôme vert et minaret
 * - Étiquettes repères (École Bousherit, Mosquée, CEM Amar, Base de vie chinoise)
 * - Éclairage PBR avec ombres 2048x2048 et brouillard
 * - Agents de simulation ABM en direct avec statuts S/I/R et lignes de contacts < 2m.
 */

import React, { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Agent, ScenarioConfig, SpatialLayout, StepMetric } from '../../types/simulation';
import {
  BRICK_COLOR,
  CITE_BUILDINGS,
  CITE_GARDENS,
  CITE_ISLANDS,
  CITE_LABELS,
  CITE_LANES,
  CITE_TREE_SPOTS,
  createRnd,
  CURB,
  distSeg,
  FLOOR,
  GREY_COLOR,
  inGarden,
  inPoly,
  nearBuilding,
  rad,
  S,
  simTo3D,
  threeToSim,
  WHITE_COLOR,
  X,
  Z,
} from '../../data/cite3dData';

export interface SelectedObjectInfo {
  type: 'building' | 'agent' | 'market' | 'tree' | 'gate' | 'point' | 'furniture' | 'street';
  id: string;
  name: string;
  details: Record<string, string | number>;
  position: { x: number; y: number; z?: number };
}

export interface ThreeUrbanSceneRef {
  resetCamera: () => void;
  setCameraPreset: (preset: 'isometric' | 'topDown' | 'pedestrian' | 'market' | 'northGate' | 'baseChinoise' | 'ecole' | 'mosque') => void;
  captureScreenshot: () => string;
  exportGLTF: (filename?: string) => Promise<void>;
  toggleVariedHeights?: () => void;
  toggleTrees?: () => void;
  toggleLabels?: () => void;
}

interface ThreeUrbanSceneProps {
  layout: SpatialLayout;
  agents: Agent[];
  config: ScenarioConfig;
  stepMetric: StepMetric | null;
  scientificMode?: boolean;
  measurementMode?: boolean;
  onMeasurementDone?: (distanceMeters: number, p1: { x: number; y: number }, p2: { x: number; y: number }) => void;
  onSelectObject?: (info: SelectedObjectInfo | null) => void;
  showProximityLines?: boolean;
  showHeatmapDensity?: boolean;
  onHoverCoords?: (coords: { x: number; y: number } | null) => void;
  objModelScale?: number;
  objModelRotY?: number;
  objModelPosX?: number;
  objModelPosZ?: number;
  objModelPosY?: number;
  showObjModel?: boolean;
  showProceduralBuildings?: boolean;
}

export const ThreeUrbanScene = forwardRef<ThreeUrbanSceneRef, ThreeUrbanSceneProps>(
  (
    {
      layout,
      agents,
      config,
      stepMetric,
      scientificMode = false,
      measurementMode = false,
      onMeasurementDone,
      onSelectObject,
      showProximityLines = true,
      showHeatmapDensity = false,
      onHoverCoords,
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    // Dynamic scene elements
    const buildingsListRef = useRef<{ mesh: THREE.Mesh; base: number; varied: number }[]>([]);
    const treeGroupRef = useRef<THREE.Group | null>(null);
    const labelsGroupRef = useRef<THREE.Group | null>(null);
    const instancedAgentsRef = useRef<THREE.InstancedMesh | null>(null);
    const proximityLinesRef = useRef<THREE.LineSegments | null>(null);
    const clickablesRef = useRef<THREE.Object3D[]>([]);
    const measurementPointsRef = useRef<THREE.Vector3[]>([]);
    const measurementLineRef = useRef<THREE.Line | null>(null);

    const [isVariedHeights, setIsVariedHeights] = useState<boolean>(true);
    const [areTreesVisible, setAreTreesVisible] = useState<boolean>(true);
    const [areLabelsVisible, setAreLabelsVisible] = useState<boolean>(true);

    const propsRef = useRef({
      agents,
      config,
      measurementMode,
      onMeasurementDone,
      onSelectObject,
      onHoverCoords,
      showProximityLines,
    });
    propsRef.current = {
      agents,
      config,
      measurementMode,
      onMeasurementDone,
      onSelectObject,
      onHoverCoords,
      showProximityLines,
    };

    // Camera presets
    const setCameraPreset = (preset: 'isometric' | 'topDown' | 'pedestrian' | 'market' | 'northGate' | 'baseChinoise' | 'ecole' | 'mosque') => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      switch (preset) {
        case 'isometric':
          camera.position.set(0, 50, 58);
          controls.target.set(0, 0, 0);
          break;
        case 'topDown':
          camera.position.set(0, 100, 0.1);
          controls.target.set(0, 0, 0);
          break;
        case 'pedestrian':
          camera.position.set(X(262), CURB + 1.2, Z(300));
          controls.target.set(X(262), CURB + 1.2, Z(340));
          break;
        case 'ecole':
          camera.position.set(X(145) - 15, 20, Z(265) + 25);
          controls.target.set(X(145), 2, Z(265));
          break;
        case 'mosque':
          camera.position.set(X(625) + 15, 22, Z(420) + 20);
          controls.target.set(X(625), 4, Z(420));
          break;
        case 'baseChinoise':
          camera.position.set(X(465) + 10, 18, Z(60) + 22);
          controls.target.set(X(465), 1, Z(60));
          break;
        case 'market':
        case 'northGate':
        default:
          camera.position.set(0, 50, 58);
          controls.target.set(0, 0, 0);
          break;
      }
      controls.update();
    };

    const resetCamera = () => {
      setCameraPreset('isometric');
    };

    const captureScreenshot = (): string => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return '';
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL('image/png');
    };

    const exportGLTF = (filename = 'Cite3D_Maquette_Numerique.glb'): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!sceneRef.current) {
          reject(new Error('Scène 3D non disponible'));
          return;
        }
        const exporter = new GLTFExporter();
        exporter.parse(
          sceneRef.current,
          (gltf) => {
            const isBinary = gltf instanceof ArrayBuffer;
            const blob = isBinary
              ? new Blob([gltf], { type: 'model/gltf-binary' })
              : new Blob([JSON.stringify(gltf, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = isBinary ? filename : filename.replace('.glb', '.gltf');
            a.click();
            URL.revokeObjectURL(url);
            resolve();
          },
          (err) => {
            console.error('Erreur exportation GLTF:', err);
            reject(err);
          },
          { binary: true }
        );
      });
    };

    const toggleVariedHeights = () => {
      setIsVariedHeights((prev) => {
        const next = !prev;
        buildingsListRef.current.forEach((b) => {
          const h = next ? b.varied : b.base;
          b.mesh.scale.y = h;
          b.mesh.position.y = CURB + h / 2;
        });
        return next;
      });
    };

    const toggleTrees = () => {
      setAreTreesVisible((prev) => {
        const next = !prev;
        if (treeGroupRef.current) treeGroupRef.current.visible = next;
        return next;
      });
    };

    const toggleLabels = () => {
      setAreLabelsVisible((prev) => {
        const next = !prev;
        if (labelsGroupRef.current) labelsGroupRef.current.visible = next;
        return next;
      });
    };

    useImperativeHandle(ref, () => ({
      resetCamera,
      setCameraPreset,
      captureScreenshot,
      exportGLTF,
      toggleVariedHeights,
      toggleTrees,
      toggleLabels,
    }));

    // Mount Three.js Scene
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 550;

      // 1. Scene & Background & Fog
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xcfd8dc);
      const fog = new THREE.Fog(0xcfd8dc, 90, 210);
      scene.fog = fog;
      sceneRef.current = scene;

      // 2. Camera & Renderer
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
      camera.position.set(0, 50, 58);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 3. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      // 4. Lights
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d9a7a, 0.85);
      scene.add(hemiLight);

      const sun = new THREE.DirectionalLight(0xfff2d6, 0.95);
      sun.position.set(-40, 70, 30);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        left: -50,
        right: 50,
        top: 50,
        bottom: -50,
        near: 1,
        far: 200,
      });
      scene.add(sun);

      // 5. Routes (Asphalte)
      const roadGeo = new THREE.PlaneGeometry(95, 95);
      const roadMat = new THREE.MeshLambertMaterial({ color: 0xa9a9a9 });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.y = -0.02;
      road.receiveShadow = true;
      scene.add(road);

      // 6. Îlots : pelouse verte avec bordure surélevée
      CITE_ISLANDS.forEach((poly) => {
        const sh = new THREE.Shape();
        poly.forEach(([px, py], i) => (i ? sh.lineTo(X(px), -Z(py)) : sh.moveTo(X(px), -Z(py))));
        const m = new THREE.Mesh(
          new THREE.ExtrudeGeometry(sh, { depth: CURB, bevelEnabled: false }),
          [
            new THREE.MeshLambertMaterial({ color: 0x9fc27c }),
            new THREE.MeshLambertMaterial({ color: 0xd8d4c4 }),
          ]
        );
        m.rotation.x = -Math.PI / 2;
        m.receiveShadow = true;
        scene.add(m);
      });

      // 7. Ruelles piétonnes
      const laneMat = new THREE.MeshLambertMaterial({ color: 0xcfc6ab });
      CITE_LANES.forEach(([pts, w]) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          const len = Math.hypot(x2 - x1, y2 - y1) * S;
          const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, w * S), laneMat);
          m.position.set(X((x1 + x2) / 2), CURB + 0.01, Z((y1 + y2) / 2));
          m.rotation.y = -Math.atan2(y2 - y1, x2 - x1);
          m.receiveShadow = true;
          scene.add(m);
        }
      });

      // 8. Immeubles
      const buildingsList: { mesh: THREE.Mesh; base: number; varied: number }[] = [];
      const clickables: THREE.Object3D[] = [];

      CITE_BUILDINGS.forEach((bDef, i) => {
        const { cx, cy, w, d, angle, floors, color, name, id } = bDef;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w * S, 1, d * S),
          new THREE.MeshLambertMaterial({ color })
        );
        mesh.position.x = X(cx);
        mesh.position.z = Z(cy);
        mesh.rotation.y = -rad(angle);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = name;
        mesh.userData = { id, floors, name, type: 'building', cx, cy, w, d, angle };

        // Dark edge wireframe for architectural clarity
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ color: 0x6b5a45, linewidth: 1 })
        );
        mesh.add(edges);
        scene.add(mesh);
        clickables.push(mesh);

        const j = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
        const baseH = floors * FLOOR;
        const variedH = floors * FLOOR * (0.7 + j * 0.9);

        mesh.scale.y = variedH;
        mesh.position.y = CURB + variedH / 2;

        buildingsList.push({ mesh, base: baseH, varied: variedH });
      });
      buildingsListRef.current = buildingsList;
      clickablesRef.current = clickables;

      // 9. Jardins paysagers
      const hedgeMat = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
      const bedMat = new THREE.MeshLambertMaterial({ color: 0x6aa84f });
      const flowerCols = [0xe53935, 0xfdd835, 0xec407a, 0xffffff, 0xab47bc];
      const gardenRnd = createRnd(42);

      CITE_GARDENS.forEach(([cx, cy, w, d]) => {
        const g = new THREE.Group();
        g.position.set(X(cx), CURB, Z(cy));
        const W = w * S;
        const D = d * S;

        const bed = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), bedMat);
        bed.position.y = 0.02;
        bed.receiveShadow = true;
        g.add(bed);

        [
          [0, D / 2, W, 0.12],
          [0, -D / 2, W, 0.12],
          [W / 2, 0, 0.12, D],
          [-W / 2, 0, 0.12, D],
        ].forEach(([x, z, sx, sz]) => {
          const h = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.22, sz), hedgeMat);
          h.position.set(x, 0.11, z);
          h.castShadow = true;
          g.add(h);
        });

        for (let k = 0; k < 30; k++) {
          const f = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshLambertMaterial({ color: flowerCols[(gardenRnd() * 5) | 0] })
          );
          f.position.set((gardenRnd() - 0.5) * (W - 0.4), 0.08, (gardenRnd() - 0.5) * (D - 0.4));
          g.add(f);
        }
        scene.add(g);
      });

      // 10. Arbres (260 instanciés)
      const treeGroup = new THREE.Group();
      scene.add(treeGroup);
      treeGroupRef.current = treeGroup;

      const trunks = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.05, 0.07, 1, 6),
        new THREE.MeshLambertMaterial({ color: 0x6d4c2f }),
        CITE_TREE_SPOTS.length
      );
      const crowns = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshLambertMaterial({ color: 0xffffff }),
        CITE_TREE_SPOTS.length
      );
      const o = new THREE.Object3D();
      const col = new THREE.Color();
      const treeRnd = createRnd(123);

      CITE_TREE_SPOTS.forEach(([px, py], i) => {
        const h = 0.6 + treeRnd() * 0.5;
        const r = 0.35 + treeRnd() * 0.3;
        o.position.set(X(px), CURB + h / 2, Z(py));
        o.scale.set(1, h, 1);
        o.updateMatrix();
        trunks.setMatrixAt(i, o.matrix);

        o.position.set(X(px), CURB + h + r * 0.7, Z(py));
        o.scale.set(r, r * 1.1, r);
        o.updateMatrix();
        crowns.setMatrixAt(i, o.matrix);
        crowns.setColorAt(i, col.setHSL(0.27 + treeRnd() * 0.07, 0.5, 0.3 + treeRnd() * 0.12));
      });
      trunks.castShadow = true;
      crowns.castShadow = true;
      treeGroup.add(trunks, crowns);

      // 11. Grande Mosquée
      const mosqGroup = new THREE.Group();
      mosqGroup.name = 'Grande Mosquée';
      mosqGroup.userData = { type: 'building', name: 'Grande Mosquée', details: { Étage: 'R+3', Dôme: '13m' } };

      const mosq = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 4), new THREE.MeshLambertMaterial({ color: 0xd0d0d0 }));
      mosq.position.set(X(625), CURB + 0.6, Z(420));
      mosq.castShadow = true;
      mosqGroup.add(mosq);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x3f8f7a })
      );
      dome.position.set(X(625), CURB + 1.2, Z(420));
      dome.castShadow = true;
      mosqGroup.add(dome);

      const mina = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4.5, 12), new THREE.MeshLambertMaterial({ color: 0xe6e6e6 }));
      mina.position.set(X(650), CURB + 2.25, Z(405));
      mina.castShadow = true;
      mosqGroup.add(mina);

      scene.add(mosqGroup);
      clickables.push(mosq);

      // 12. Étiquettes sprites
      const labelsGroup = new THREE.Group();
      scene.add(labelsGroup);
      labelsGroupRef.current = labelsGroup;

      CITE_LABELS.forEach(({ text, px, py, y3d }) => {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 128;
        const g = c.getContext('2d');
        if (g) {
          g.font = 'bold 44px sans-serif';
          g.textAlign = 'center';
          g.fillStyle = '#111827';
          g.fillText(text, 256, 76);
        }
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
        s.scale.set(8, 2, 1);
        s.position.set(X(px), y3d, Z(py));
        labelsGroup.add(s);
      });

      // 13. Live Agent Instanced Mesh (Capacity up to 20,000 agents without limit)
      const maxAgents = 20000;
      const agentGeo = new THREE.CapsuleGeometry(0.2, 0.45, 6, 8);
      const agentMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 });
      const instancedAgents = new THREE.InstancedMesh(agentGeo, agentMat, maxAgents);
      instancedAgents.castShadow = true;
      instancedAgents.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(instancedAgents);
      instancedAgentsRef.current = instancedAgents;

      // 14. Proximity Contact Lines (<2m)
      const lineGeo = new THREE.BufferGeometry();
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xef4444,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const proximityLines = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(proximityLines);
      proximityLinesRef.current = proximityLines;

      // 15. Raycaster Interactions (Click & Measurement)
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleClick = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // In measurement mode: measure distance between two points
        if (propsRef.current.measurementMode) {
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CURB);
          const intersectPoint = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
            measurementPointsRef.current.push(intersectPoint);
            if (measurementPointsRef.current.length === 2) {
              const p1 = measurementPointsRef.current[0];
              const p2 = measurementPointsRef.current[1];
              const distUnits = p1.distanceTo(p2);
              // In Cite3D, S=0.1 means 1 unit = 10px (~7.6 meters)
              const distMeters = distUnits * 7.6;
              const simP1 = threeToSim(p1.x, p1.z);
              const simP2 = threeToSim(p2.x, p2.z);

              // Draw line
              if (measurementLineRef.current) scene.remove(measurementLineRef.current);
              const lineG = new THREE.BufferGeometry().setFromPoints([p1, p2]);
              const lineM = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
              const mLine = new THREE.Line(lineG, lineM);
              scene.add(mLine);
              measurementLineRef.current = mLine;

              if (propsRef.current.onMeasurementDone) {
                propsRef.current.onMeasurementDone(
                  distMeters,
                  { x: simP1.simX, y: simP1.simY },
                  { x: simP2.simX, y: simP2.simY }
                );
              }
              measurementPointsRef.current = [];
            }
          }
          return;
        }

        // Object & Agent selection raycast
        const selectableTargets = instancedAgentsRef.current
          ? [...clickablesRef.current, instancedAgentsRef.current]
          : clickablesRef.current;
        const intersects = raycaster.intersectObjects(selectableTargets, false);
        if (intersects.length > 0) {
          const hit = intersects[0];
          // Check if agent instanced mesh was hit
          if (hit.object === instancedAgentsRef.current && hit.instanceId !== undefined) {
            const agentIdx = hit.instanceId;
            const ag = propsRef.current.agents[agentIdx];
            if (ag && propsRef.current.onSelectObject) {
              const demLabel =
                ag.demographic === 'elderly'
                  ? 'Personne Âgée (Vulnérable)'
                  : ag.demographic === 'child'
                  ? 'Enfant (Élève / Jeune)'
                  : 'Adulte / Jeune Parent';
              propsRef.current.onSelectObject({
                type: 'agent',
                id: `agent_${ag.id}`,
                name: `Piéton 3D #${ag.id} — ${demLabel}`,
                details: {
                  'Groupe Démographique': demLabel,
                  'Cellule Familiale': `Famille #${ag.familyId || 1} (Foyer intergénérationnel)`,
                  'Statut Sanitaire':
                    ag.state === 'I'
                      ? 'Infecté (Contagieux)'
                      : ag.state === 'R'
                      ? 'Rétabli (Immunisé)'
                      : 'Sain (Susceptible)',
                  'Port du Masque': ag.maskWearing ? 'Oui (Atténuation 65%)' : 'Non',
                  'Vitesse': `${ag.speed.toFixed(2)} m/s`,
                  'Contacts Rapprochés (<2m)': ag.cumulativeContacts,
                  'Vecteur Contamination':
                    ag.transmissionPathway === 'fomite'
                      ? 'Surfaces / Étal de marché'
                      : ag.transmissionPathway === 'aerosol'
                      ? 'Aérosol (Microclimat ENVI-met)'
                      : 'Sain / Non infecté',
                  'Coordonnées UV9': `X: ${ag.x.toFixed(1)}m, Y: ${ag.y.toFixed(1)}m`,
                },
                position: { x: ag.x, y: ag.y, z: 1.7 },
              });
              return;
            }
          }

          // Otherwise building hit
          const bldHit = hit.object;
          const uData = bldHit.userData;
          if (uData && propsRef.current.onSelectObject) {
            const simCoords = threeToSim(bldHit.position.x, bldHit.position.z);
            propsRef.current.onSelectObject({
              type: 'building',
              id: uData.id || 'bld',
              name: uData.name || bldHit.name || 'Bâtiment',
              details: {
                'Niveaux / Étages': `R+${uData.floors || 4}`,
                Hauteur: `${((uData.floors || 4) * 3.2).toFixed(1)} m`,
                'Emprise au sol': `${uData.w || 40}m × ${uData.d || 20}m`,
                Orientation: `${uData.angle || 0}°`,
                'Coordonnées UV9': `X: ${simCoords.simX}m, Y: ${simCoords.simY}m`,
              },
              position: { x: simCoords.simX, y: simCoords.simY, z: (uData.floors || 4) * 3.2 },
            });
          }
        }
      };

      const handlePointerMove = (e: MouseEvent) => {
        if (!propsRef.current.onHoverCoords) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CURB);
        const intersectPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
          const sim = threeToSim(intersectPoint.x, intersectPoint.z);
          propsRef.current.onHoverCoords({ x: sim.simX, y: sim.simY });
        }
      };

      renderer.domElement.addEventListener('click', handleClick);
      renderer.domElement.addEventListener('mousemove', handlePointerMove);

      // Handle Resize
      const handleResize = () => {
        if (!container || !rendererRef.current || !cameraRef.current) return;
        const w = container.clientWidth || 800;
        const h = container.clientHeight || 550;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // Animation Loop
      let animId: number;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('click', handleClick);
        renderer.domElement.removeEventListener('mousemove', handlePointerMove);
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    }, []);

    // Synchronize Live Simulation Agents & Contacts
    useEffect(() => {
      const instanced = instancedAgentsRef.current;
      if (!instanced) return;

      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      const maxCap = instanced.instanceMatrix.count;
      const count = Math.min(agents.length, maxCap);
      instanced.count = count;

      // Color mapping according to user specifications:
      // - Vert (Green): personne saine
      // - Rouge (Red): personne infectée
      // - Jaune (Yellow): personne exposée / rétablie
      const COLOR_S = 0x22c55e; // Vert : sain
      const COLOR_I = 0xef4444; // Rouge : infecté
      const COLOR_R = 0xeab308; // Jaune : rétabli / exposé

      for (let i = 0; i < count; i++) {
        const a = agents[i];
        const pos3D = simTo3D(a.x, a.y, CURB + 0.35);
        dummy.position.set(pos3D.x, pos3D.y, pos3D.z);

        // Realistic pedestrian orientation facing their travel direction
        if (a.targetX !== undefined && a.targetY !== undefined) {
          const dx = a.targetX - a.x;
          const dy = a.targetY - a.y;
          if (dx * dx + dy * dy > 0.1) {
            dummy.rotation.y = -Math.atan2(dy, dx) + Math.PI / 2;
          }
        }

        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);

        let stateColor = COLOR_S;
        if (a.state === 'I') stateColor = COLOR_I;
        else if (a.state === 'R') stateColor = COLOR_R;

        col.setHex(stateColor);
        instanced.setColorAt(i, col);
      }
      instanced.instanceMatrix.needsUpdate = true;
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

      // Update Contact proximity lines (< 2.0m)
      if (proximityLinesRef.current) {
        if (!showProximityLines) {
          proximityLinesRef.current.visible = false;
        } else {
          proximityLinesRef.current.visible = true;
          const linePts: number[] = [];
          const thresholdSq = (config.contamination.contactDistanceThresholdMeters || 2.0) ** 2;

          if (agents.length <= 350) {
            // Direct pairwise check for moderate populations
            for (let i = 0; i < agents.length; i++) {
              for (let j = i + 1; j < agents.length; j++) {
                const a1 = agents[i];
                const a2 = agents[j];
                const dx = a1.x - a2.x;
                const dy = a1.y - a2.y;
                if (dx * dx + dy * dy <= thresholdSq) {
                  const p1 = simTo3D(a1.x, a1.y, CURB + 0.4);
                  const p2 = simTo3D(a2.x, a2.y, CURB + 0.4);
                  linePts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                  if (linePts.length >= 6000) break;
                }
              }
              if (linePts.length >= 6000) break;
            }
          } else {
            // High-performance spatial hashing for dense populations (5,000+ agents)
            const cellSize = 5.0;
            const grid = new Map<string, number[]>();
            const maxEvaluated = Math.min(agents.length, 10000);

            for (let i = 0; i < maxEvaluated; i++) {
              const a = agents[i];
              const cellKey = `${Math.floor(a.x / cellSize)}_${Math.floor(a.y / cellSize)}`;
              const list = grid.get(cellKey);
              if (list) {
                list.push(i);
              } else {
                grid.set(cellKey, [i]);
              }
            }

            for (const [, indices] of grid) {
              if (indices.length > 1) {
                for (let i = 0; i < indices.length; i++) {
                  for (let j = i + 1; j < indices.length; j++) {
                    const a1 = agents[indices[i]];
                    const a2 = agents[indices[j]];
                    const dx = a1.x - a2.x;
                    const dy = a1.y - a2.y;
                    if (dx * dx + dy * dy <= thresholdSq) {
                      const p1 = simTo3D(a1.x, a1.y, CURB + 0.4);
                      const p2 = simTo3D(a2.x, a2.y, CURB + 0.4);
                      linePts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                      if (linePts.length >= 6000) break;
                    }
                  }
                  if (linePts.length >= 6000) break;
                }
              }
              if (linePts.length >= 6000) break;
            }
          }

          proximityLinesRef.current.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(linePts, 3)
          );
          proximityLinesRef.current.geometry.computeBoundingSphere();
        }
      }
    }, [agents, showProximityLines, config]);

    return (
      <div className="w-full h-full relative group">
        <div ref={mountRef} className="w-full h-full min-h-[550px] cursor-grab active:cursor-grabbing" />

        {/* Floating Quick Action Overlay matching Cite3D Controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs shadow-lg">
          <button
            onClick={toggleVariedHeights}
            className={`px-2 py-0.5 rounded font-medium transition ${
              isVariedHeights ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Basculer entre hauteurs d'immeubles variées et régulières"
          >
            {isVariedHeights ? 'Hauteurs variées' : 'Hauteurs régulières'}
          </button>
          <button
            onClick={toggleTrees}
            className={`px-2 py-0.5 rounded font-medium transition ${
              areTreesVisible ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Afficher ou masquer les 260 arbres de la cité"
          >
            Arbres
          </button>
          <button
            onClick={toggleLabels}
            className={`px-2 py-0.5 rounded font-medium transition ${
              areLabelsVisible ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Afficher ou masquer les étiquettes repères (École, Mosquée, CEM...)"
          >
            Étiquettes
          </button>
        </div>
      </div>
    );
  }
);
