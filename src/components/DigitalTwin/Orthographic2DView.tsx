/**
 * Vue 2D du Jumeau Numérique — plan masse du modèle urbain "Secteur – ville nouvelle"
 *
 * La 2D est le même modèle que la 3D (mêmes 50 matériaux, mêmes couleurs, même éclairage),
 * vu du dessus en projection orthographique, nord en haut. Rien n'est redessiné à la main :
 * le plan montre exactement la géométrie du fichier "Modèle urbain 3D.html".
 *
 * Par-dessus : agents S/I/R, lignes de contact < 2 m, étiquettes, mesure de distance
 * et sélection d'objets.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Agent, ScenarioConfig, SpatialLayout, StepMetric } from '../../types/simulation';
import { SelectedObjectInfo } from './ThreeUrbanScene';
import {
  BUILDING_MATERIALS,
  createSiteGroup,
  createSiteRenderer,
  createSiteScene,
  GROUND_Y,
  loadSiteModel,
  MODEL_CENTER,
  MODEL_D,
  MODEL_W,
  modelToSim,
  SiteModelData,
  SITE_LABELS,
  simToModel,
  TREE_MATERIALS,
} from '../../engine/siteModel';

interface Orthographic2DViewProps {
  layout: SpatialLayout;
  agents: Agent[];
  config: ScenarioConfig;
  stepMetric: StepMetric | null;
  measurementMode: boolean;
  onMeasurementDone?: (distanceMeters: number, p1: { x: number; y: number }, p2: { x: number; y: number }) => void;
  onSelectObject?: (info: SelectedObjectInfo | null) => void;
  showProximityLines?: boolean;
  showHeatmapDensity?: boolean;
  showStreetFlows?: boolean;
  onHoverCoords?: (coords: { x: number; y: number } | null) => void;
  referencePlanOpacity?: number;
  referencePlanUrl?: string | null;
  /** Si défini, pilote l'affichage des arbres depuis l'extérieur. */
  showTrees?: boolean;
}

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 12;

export const Orthographic2DView: React.FC<Orthographic2DViewProps> = ({
  layout,
  agents,
  config,
  measurementMode,
  onMeasurementDone,
  onSelectObject,
  showProximityLines = true,
  showHeatmapDensity = false,
  onHoverCoords,
  showTrees: showTreesProp,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const modelRef = useRef<SiteModelData | null>(null);
  const meshesRef = useRef<Record<string, THREE.Mesh>>({});
  const sizeRef = useRef({ w: 800, h: 560 });
  const viewRef = useRef({ cx: MODEL_CENTER.x, cz: MODEL_CENTER.z, zoom: 1 });
  const needsSceneRenderRef = useRef(true);
  const drawOverlayRef = useRef<() => void>(() => {});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoomDisplay, setZoomDisplay] = useState<number>(1);
  const [showTrees, setShowTrees] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showAgents, setShowAgents] = useState<boolean>(true);

  const propsRef = useRef({
    layout,
    showHeatmapDensity,
    agents,
    config,
    measurementMode,
    onMeasurementDone,
    onSelectObject,
    onHoverCoords,
    showProximityLines,
    showAgents,
    showLabels,
  });
  propsRef.current = {
    layout,
    showHeatmapDensity,
    agents,
    config,
    measurementMode,
    onMeasurementDone,
    onSelectObject,
    onHoverCoords,
    showProximityLines,
    showAgents,
    showLabels,
  };

  const measureARef = useRef<{ x: number; z: number } | null>(null);

  // Géométrie de la vue : emprise visible en mètres
  const getExtent = () => {
    const { w, h } = sizeRef.current;
    const aspect = w / h;
    const baseHalfH = Math.max((MODEL_D / 2) * 1.04, ((MODEL_W / 2) * 1.04) / aspect);
    const halfH = baseHalfH / viewRef.current.zoom;
    return { halfH, halfW: halfH * aspect };
  };

  const updateCamera = () => {
    const cam = cameraRef.current;
    if (!cam) return;
    const { halfH, halfW } = getExtent();
    const { cx, cz } = viewRef.current;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.position.set(cx, 600, cz);
    cam.up.set(0, 0, -1); // nord en haut
    cam.lookAt(cx, 0, cz);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    needsSceneRenderRef.current = true;
    drawOverlayRef.current();
  };

  // Coordonnées écran <-> modèle (vue du dessus)
  const toScreen = (x: number, z: number) => {
    const { w, h } = sizeRef.current;
    const { halfH, halfW } = getExtent();
    const { cx, cz } = viewRef.current;
    return { sx: ((x - cx) / (2 * halfW) + 0.5) * w, sy: ((z - cz) / (2 * halfH) + 0.5) * h };
  };
  const toModel = (sx: number, sy: number) => {
    const { w, h } = sizeRef.current;
    const { halfH, halfW } = getExtent();
    const { cx, cz } = viewRef.current;
    return { x: cx + (sx / w - 0.5) * 2 * halfW, z: cz + (sy / h - 0.5) * 2 * halfH };
  };

  const setZoom = (z: number) => {
    viewRef.current.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    setZoomDisplay(viewRef.current.zoom);
    updateCamera();
  };

  const resetView = () => {
    viewRef.current = { cx: MODEL_CENTER.x, cz: MODEL_CENTER.z, zoom: 1 };
    setZoomDisplay(1);
    updateCamera();
  };

  // Dessin de la couche agents / contacts / étiquettes / mesure
  drawOverlayRef.current = () => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const p = propsRef.current;
    const zoom = viewRef.current.zoom;

    // Carte de densité (agents pondérés : infecté x3)
    if (p.showHeatmapDensity && p.showAgents) {
      const cell = 8;
      const bins = new Map<string, { x: number; y: number; w: number }>();
      for (const a of p.agents) {
        const key = `${Math.floor(a.x / cell)}_${Math.floor(a.y / cell)}`;
        const b = bins.get(key);
        const wgt = a.state === 'I' ? 3 : 1;
        if (b) b.w += wgt;
        else bins.set(key, { x: (Math.floor(a.x / cell) + 0.5) * cell, y: (Math.floor(a.y / cell) + 0.5) * cell, w: wgt });
      }
      const { halfW } = getExtent();
      const rPx = Math.max(10, (18 / (2 * halfW)) * w);
      bins.forEach((b) => {
        const m = simToModel(b.x, b.y);
        const { sx, sy } = toScreen(m.x, m.z);
        const alpha = Math.min(0.55, 0.12 + b.w * 0.07);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rPx);
        g.addColorStop(0, `rgba(244,63,94,${alpha})`);
        g.addColorStop(1, 'rgba(244,63,94,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, rPx, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Marché (orange) et portes d'accès (cyan)
    {
      const mk = p.config.marketRelocated ? p.config.marketPosition : { x: p.layout.market.x, y: p.layout.market.y };
      const mm = simToModel(mk.x, mk.y);
      const ms = toScreen(mm.x, mm.z);
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(249,115,22,0.9)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(ms.sx - 8, ms.sy - 8, 16, 16, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7c2d12';
      ctx.fillText(p.layout.market.name?.split(' ')[0] || 'Marché', ms.sx, ms.sy - 12);

      p.layout.visitorGates.forEach((g) => {
        const gm = simToModel(g.position.x, g.position.y);
        const gs = toScreen(gm.x, gm.z);
        ctx.fillStyle = 'rgba(6,182,212,0.95)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(gs.sx, gs.sy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Étiquettes repères
    if (p.showLabels) {
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      SITE_LABELS.forEach((l) => {
        const { sx, sy } = toScreen(l.x, l.z);
        if (sx < -80 || sx > w + 80 || sy < -20 || sy > h + 20) return;
        const tw = ctx.measureText(l.text).width + 14;
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(sx - tw / 2, sy - 11, tw, 22, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.fillText(l.text, sx, sy + 4);
      });
    }

    if (p.showAgents) {
      const list = p.agents;

      // Lignes de contact (< 2 m)
      if (p.showProximityLines) {
        const thresholdSq = (p.config.contamination.contactDistanceThresholdMeters || 2.0) ** 2;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        let drawn = 0;
        const draw = (a1: Agent, a2: Agent) => {
          const m1 = simToModel(a1.x, a1.y);
          const m2 = simToModel(a2.x, a2.y);
          const s1 = toScreen(m1.x, m1.z);
          const s2 = toScreen(m2.x, m2.z);
          ctx.moveTo(s1.sx, s1.sy);
          ctx.lineTo(s2.sx, s2.sy);
          drawn++;
        };
        if (list.length <= 300) {
          outer: for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              const dx = list[i].x - list[j].x;
              const dy = list[i].y - list[j].y;
              if (dx * dx + dy * dy <= thresholdSq) {
                draw(list[i], list[j]);
                if (drawn >= 800) break outer;
              }
            }
          }
        } else {
          const cellSize = 5.0;
          const grid = new Map<string, number[]>();
          const limit = Math.min(list.length, 6000);
          for (let i = 0; i < limit; i++) {
            const a = list[i];
            const key = `${Math.floor(a.x / cellSize)}_${Math.floor(a.y / cellSize)}`;
            const arr = grid.get(key);
            if (arr) arr.push(i);
            else grid.set(key, [i]);
          }
          outerGrid: for (const [, idxs] of grid) {
            for (let i = 0; i < idxs.length; i++) {
              for (let j = i + 1; j < idxs.length; j++) {
                const a1 = list[idxs[i]];
                const a2 = list[idxs[j]];
                const dx = a1.x - a2.x;
                const dy = a1.y - a2.y;
                if (dx * dx + dy * dy <= thresholdSq) {
                  draw(a1, a2);
                  if (drawn >= 800) break outerGrid;
                }
              }
            }
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Agents : vert = sain, rouge = infecté, jaune = rétabli
      const r = 2.6 + Math.min(zoom, 6) * 0.5;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const m = simToModel(a.x, a.y);
        const { sx, sy } = toScreen(m.x, m.z);
        if (sx < -6 || sx > w + 6 || sy < -6 || sy > h + 6) continue;
        const inf = a.state === 'I';
        ctx.fillStyle = inf ? '#ef4444' : a.state === 'R' ? '#eab308' : '#22c55e';
        ctx.beginPath();
        ctx.arc(sx, sy, inf ? r + 0.7 : r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Point de mesure en cours
    if (measureARef.current) {
      const { sx, sy } = toScreen(measureARef.current.x, measureARef.current.z);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  // Montage Three.js (caméra orthographique vue du dessus)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let disposed = false;

    const { scene } = createSiteScene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 2000);
    cameraRef.current = camera;

    const renderer = createSiteRenderer();
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const handleResize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 560;
      sizeRef.current = { w, h };
      renderer.setSize(w, h);
      updateCamera();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    loadSiteModel()
      .then((model) => {
        if (disposed) return;
        modelRef.current = model;
        const { group, byMaterial } = createSiteGroup(model);
        // Plan : pas d'ombres portées
        group.children.forEach((c) => ((c as THREE.Mesh).castShadow = (c as THREE.Mesh).receiveShadow = false));
        scene.add(group);
        meshesRef.current = byMaterial;
        setIsLoading(false);
        needsSceneRenderRef.current = true;
      })
      .catch((err) => {
        if (disposed) return;
        console.error(err);
        setLoadError(err?.message || 'Impossible de charger le modèle urbain');
        setIsLoading(false);
      });

    // Interactions : déplacement (glisser), zoom (molette), clic
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    let drag: { x: number; y: number; moved: number } | null = null;
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);

    const localPos = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    };

    const onContext = (e: Event) => e.preventDefault();
    const onDown = (e: PointerEvent) => {
      if (propsRef.current.measurementMode) return;
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      drag = null;
    };
    const onMove = (e: PointerEvent) => {
      const { sx, sy } = localPos(e);
      if (drag) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        const { w, h } = sizeRef.current;
        const { halfH, halfW } = getExtent();
        viewRef.current.cx -= dx * ((2 * halfW) / w);
        viewRef.current.cz -= dy * ((2 * halfH) / h);
        updateCamera();
      }
      const onHover = propsRef.current.onHoverCoords;
      if (onHover) {
        const m = toModel(sx, sy);
        const sim = modelToSim(m.x, m.z);
        onHover({ x: sim.simX, y: sim.simY });
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { sx, sy } = localPos(e);
      const before = toModel(sx, sy);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      viewRef.current.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewRef.current.zoom * factor));
      // Zoom centré sur le curseur
      const after = toModel(sx, sy);
      viewRef.current.cx += before.x - after.x;
      viewRef.current.cz += before.z - after.z;
      setZoomDisplay(viewRef.current.zoom);
      updateCamera();
    };

    const onClick = (e: MouseEvent) => {
      if (drag && drag.moved > 4) return;
      const { sx, sy } = localPos(e);
      const m = toModel(sx, sy);
      const p = propsRef.current;

      // Mesure : distance réelle en mètres
      if (p.measurementMode) {
        if (!measureARef.current) {
          measureARef.current = { x: m.x, z: m.z };
          drawOverlayRef.current();
        } else {
          const a = measureARef.current;
          const dist = Math.hypot(m.x - a.x, m.z - a.z);
          const s1 = modelToSim(a.x, a.z);
          const s2 = modelToSim(m.x, m.z);
          p.onMeasurementDone?.(dist, { x: s1.simX, y: s1.simY }, { x: s2.simX, y: s2.simY });
          measureARef.current = null;
          drawOverlayRef.current();
        }
        return;
      }

      const onSelect = p.onSelectObject;
      if (!onSelect) return;

      // Agent le plus proche (rayon de 14 px)
      if (p.showAgents) {
        let closest: Agent | null = null;
        let minD = 14;
        for (let i = 0; i < p.agents.length; i++) {
          const ag = p.agents[i];
          const am = simToModel(ag.x, ag.y);
          const s = toScreen(am.x, am.z);
          const d = Math.hypot(s.sx - sx, s.sy - sy);
          if (d < minD) {
            minD = d;
            closest = ag;
          }
        }
        if (closest) {
          const a = closest;
          const demLabel =
            a.demographic === 'elderly'
              ? 'Personne Âgée (Vulnérable)'
              : a.demographic === 'child'
              ? 'Enfant (Élève / Jeune)'
              : 'Adulte / Jeune Parent';
          onSelect({
            type: 'agent',
            id: `agent_${a.id}`,
            name: `Agent #${a.id} — ${demLabel}`,
            details: {
              'Groupe Démographique': demLabel,
              'Cellule Familiale': `Famille #${a.familyId || 1} (Foyer intergénérationnel)`,
              'Statut Sanitaire':
                a.state === 'I' ? 'Infecté (Contagieux)' : a.state === 'R' ? 'Rétabli (Immunisé)' : 'Sain (Susceptible)',
              'Port du Masque': a.maskWearing ? 'Oui (Atténuation 65%)' : 'Non',
              'Vitesse Réelle': `${a.speed.toFixed(2)} m/s`,
              'Contacts Cumulés (<2m)': a.cumulativeContacts,
              'Vecteur Transmission':
                a.transmissionPathway === 'fomite'
                  ? 'Surfaces / Fomite (Étal de marché)'
                  : a.transmissionPathway === 'aerosol'
                  ? 'Aérosol (Microclimat ENVI-met)'
                  : 'Sain / Non infecté',
              'Coordonnées UV9': `X: ${a.x.toFixed(1)}m, Y: ${a.y.toFixed(1)}m`,
            },
            position: { x: a.x, y: a.y, z: 1.7 },
          });
          return;
        }
      }

      // Élément bâti du modèle sous le curseur
      const { w, h } = sizeRef.current;
      const ndc = new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const targets = Object.keys(BUILDING_MATERIALS)
        .map((n) => meshesRef.current[n])
        .filter(Boolean);
      const hit = raycaster.intersectObjects(targets, false)[0];
      if (hit) {
        const matName = (hit.object.userData?.siteMaterial as string) || hit.object.name;
        const label = BUILDING_MATERIALS[matName] || matName;
        const sim = modelToSim(hit.point.x, hit.point.z);
        onSelect({
          type: 'building',
          id: `${matName}_${Math.round(hit.point.x)}_${Math.round(hit.point.z)}`,
          name: label,
          details: {
            Élément: label,
            Matériau: matName,
            'Altitude du point': `${hit.point.y.toFixed(1)} m`,
            'Position modèle': `X: ${hit.point.x.toFixed(1)} m, Z: ${hit.point.z.toFixed(1)} m`,
            'Coordonnées UV9': `X: ${sim.simX}m, Y: ${sim.simY}m`,
          },
          position: { x: sim.simX, y: sim.simY, z: hit.point.y },
        });
      } else {
        onSelect(null);
      }
    };

    el.addEventListener('contextmenu', onContext);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', onClick);

    // Rendu WebGL à la demande
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!needsSceneRenderRef.current) return;
      needsSceneRenderRef.current = false;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      el.removeEventListener('contextmenu', onContext);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onClick);
      // Géométries et matériaux du modèle sont partagés (cache) : on ne les libère pas.
      if (el.parentNode) el.parentNode.removeChild(el);
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (showTreesProp !== undefined) setShowTrees(showTreesProp);
  }, [showTreesProp]);

  // Arbres (troncs, feuillages, conifères, palmiers)
  useEffect(() => {
    TREE_MATERIALS.forEach((n) => {
      const m = meshesRef.current[n];
      if (m) m.visible = showTrees;
    });
    needsSceneRenderRef.current = true;
  }, [showTrees, isLoading]);

  // Redessin de la couche agents quand les données ou les calques changent
  useEffect(() => {
    drawOverlayRef.current();
  }, [agents, showAgents, showLabels, showProximityLines, showHeatmapDensity, layout, config, isLoading]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#dfe8f0] select-none">
      {/* Commandes 2D : calques et zoom */}
      <div className="absolute top-9 left-2 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-1rem)] bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-xs shadow-lg">
        <button
          onClick={() => setShowTrees(!showTrees)}
          className={`px-2 py-0.5 rounded font-medium transition ${
            showTrees ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
          title="Afficher/Masquer les arbres"
        >
          Arbres
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-2 py-0.5 rounded font-medium transition ${
            showLabels ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
          title="Afficher/Masquer les étiquettes"
        >
          Étiquettes
        </button>
        <button
          onClick={() => setShowAgents(!showAgents)}
          className={`px-2 py-0.5 rounded font-medium transition ${
            showAgents ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
          title="Afficher/Masquer les agents de simulation"
        >
          Agents ({agents.length})
        </button>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <button
          onClick={() => setZoom(viewRef.current.zoom * 1.25)}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          title="Zoom +"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(viewRef.current.zoom / 1.25)}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          title="Zoom -"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetView}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          title="Réinitialiser vue"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <span className="text-slate-400 font-mono w-9 text-right">×{zoomDisplay.toFixed(1)}</span>
      </div>

      <div ref={mountRef} className="absolute inset-0 min-h-[550px] cursor-crosshair" />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {isLoading && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/80 text-slate-200 text-sm">
          Chargement du modèle…
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/90 text-rose-300 text-sm px-6 text-center">
          {loadError}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-20 text-[11px] text-slate-700 bg-white/80 px-2 py-1 rounded border border-slate-300">
        Plan 2D du modèle urbain · Glisser : déplacer · Molette : zoom · Nord en haut
      </div>
    </div>
  );
};
