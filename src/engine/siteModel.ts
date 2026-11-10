/**
 * Modèle urbain 3D — "Secteur – ville nouvelle"
 *
 * Source unique pour la 2D et la 3D de toute l'application. La géométrie, les matériaux,
 * l'éclairage, le décodage et les vues caméra reprennent exactement ceux du fichier
 * "Modèle urbain 3D.html" (50 matériaux, ~2,4 M de sommets, unités = mètres).
 *
 * Ce module ne dépend d'aucun composant React : il charge le modèle une seule fois
 * (mis en cache) et fournit les outils pour construire des scènes Three.js.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Chargement du modèle (mêmes données que le HTML : D.mats, D.data, D.frame)
// ---------------------------------------------------------------------------

export const SITE_MODEL_URL = `${import.meta.env.BASE_URL}models/site_urbain/modele_urbain_3d.json`;

interface RawSiteModel {
  mats: Record<string, { c: [number, number, number]; a: number }>;
  data: Record<string, string>;
  frame: [number, number][];
}

export interface SiteModelData {
  /** Géométrie partagée (non indexée, normales plates) par matériau. */
  geometries: Record<string, THREE.BufferGeometry>;
  /** Matériaux Lambert partagés. */
  materials: Record<string, THREE.MeshLambertMaterial>;
  /** Contour du secteur (repère DWG d'origine). */
  frame: [number, number][];
  triangleCount: number;
}

// Même décodage que le HTML : Int16 deflate-base64
async function decodeInt16(b64: string): Promise<Int16Array> {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Int16Array(await new Response(stream).arrayBuffer());
}

let modelPromise: Promise<SiteModelData> | null = null;

export function loadSiteModel(): Promise<SiteModelData> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    const res = await fetch(SITE_MODEL_URL);
    if (!res.ok) throw new Error(`Modèle urbain introuvable (${res.status})`);
    const raw = (await res.json()) as RawSiteModel;

    const geometries: Record<string, THREE.BufferGeometry> = {};
    const materials: Record<string, THREE.MeshLambertMaterial> = {};
    let triangleCount = 0;

    const entries = Object.entries(raw.data);
    const decoded = await Promise.all(entries.map(([, b64]) => decodeInt16(b64)));

    entries.forEach(([name], idx) => {
      const q = decoded[idx];
      const n = q.length;
      const f = new Float32Array(n);
      // Identique au HTML : DWG (x, y, z) -> Three (x, z, -y), échelle 0,02 m
      for (let i = 0; i < n; i += 3) {
        f[i] = q[i] * 0.02;
        f[i + 1] = q[i + 2] * 0.02;
        f[i + 2] = -q[i + 1] * 0.02;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(f, 3));
      g.computeVertexNormals();
      geometries[name] = g;
      triangleCount += n / 9;

      const c = raw.mats[name] || { c: [0.7, 0.7, 0.7], a: 1 };
      // Le HTML (three r128) utilise les couleurs telles quelles, sans conversion sRGB.
      const color = new THREE.Color().setRGB(c.c[0], c.c[1], c.c[2], THREE.LinearSRGBColorSpace);
      materials[name] = new THREE.MeshLambertMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: c.a < 1,
        opacity: c.a,
      });
    });

    return { geometries, materials, frame: raw.frame, triangleCount };
  })();
  // En cas d'échec, permettre une nouvelle tentative
  modelPromise.catch(() => {
    modelPromise = null;
  });
  return modelPromise;
}

// ---------------------------------------------------------------------------
// Repère : simulation (mètres 0..500 × 0..400) <-> modèle (mètres, centré)
// Le domaine de simulation couvre tout le secteur, comme dans l'ancien plan.
// ---------------------------------------------------------------------------

export const SIM_W = 500;
export const SIM_H = 400;

export const MODEL_BOUNDS = { xMin: -260, xMax: 260, zMin: -263, zMax: 262 } as const;
export const MODEL_W = MODEL_BOUNDS.xMax - MODEL_BOUNDS.xMin;
export const MODEL_D = MODEL_BOUNDS.zMax - MODEL_BOUNDS.zMin;
export const MODEL_CENTER = {
  x: (MODEL_BOUNDS.xMin + MODEL_BOUNDS.xMax) / 2,
  z: (MODEL_BOUNDS.zMin + MODEL_BOUNDS.zMax) / 2,
};

/** Altitude de marche (trottoirs) dans le modèle. */
export const GROUND_Y = 0.2;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function simToModel(simX: number, simY: number): { x: number; z: number } {
  return {
    x: MODEL_BOUNDS.xMin + (clamp(simX, 0, SIM_W) / SIM_W) * MODEL_W,
    z: MODEL_BOUNDS.zMin + (clamp(simY, 0, SIM_H) / SIM_H) * MODEL_D,
  };
}

export function modelToSim(x: number, z: number): { simX: number; simY: number } {
  return {
    simX: Math.round(clamp(((x - MODEL_BOUNDS.xMin) / MODEL_W) * SIM_W, 0, SIM_W)),
    simY: Math.round(clamp(((z - MODEL_BOUNDS.zMin) / MODEL_D) * SIM_H, 0, SIM_H)),
  };
}

/** Ancien repère "Cite3D" en pixels (zone 60..700 × 70..680) -> modèle. */
export function citePxToModel(px: number, py: number): { x: number; z: number } {
  return {
    x: MODEL_BOUNDS.xMin + ((px - 60) / 640) * MODEL_W,
    z: MODEL_BOUNDS.zMin + ((py - 70) / 610) * MODEL_D,
  };
}

// ---------------------------------------------------------------------------
// Éléments du modèle
// ---------------------------------------------------------------------------

/** Matériaux qui forment la végétation arborée (bouton « Arbres »). */
export const TREE_MATERIALS = ['tronc', 'feuillage1', 'feuillage2', 'feuillage3', 'conifere', 'palme'];

/** Matériaux qui forment les bâtiments (sélection par clic). */
export const BUILDING_MATERIALS: Record<string, string> = {
  crepi_gris: 'Façade crépi gris',
  crepi_blanc: 'Façade crépi blanc',
  crepi_beige: 'Façade crépi beige',
  crepi_ocre: 'Façade crépi ocre',
  beton: 'Structure béton',
  socle_pierre: 'Socle en pierre',
  acrotere: 'Acrotère',
  toiture: 'Toiture',
  menuiserie: 'Menuiseries',
  verre: 'Vitrages',
  porte_bois: 'Portes en bois',
  garde_corps: 'Garde-corps',
  mosquee_blanc: 'Grande Mosquée',
  dome: 'Dôme de la Mosquée',
  or: 'Éléments dorés (hôtel / mosquée)',
};

export interface SiteLabel {
  text: string;
  x: number;
  z: number;
  /** hauteur du sprite au-dessus du sol en 3D (m) */
  y: number;
}

export const SITE_LABELS: SiteLabel[] = [
  { text: 'École', x: -150, z: -70, y: 34 },
  { text: 'Mosquée', x: 193, z: 50, y: 42 },
  { text: 'Hôtel', x: 205, z: -55, y: 40 },
  { text: 'Base de vie chinoise', x: 216, z: -192, y: 22 },
  { text: 'CEM Amar', ...citePxToModel(690, 448), y: 30 },
];

// ---------------------------------------------------------------------------
// Vues caméra (identiques au HTML : cible x,y,z · azimut · élévation · distance)
// ---------------------------------------------------------------------------

export type SiteViewKey = 'iso' | 'top' | 'hotel' | 'ecole' | 'rue' | 'base' | 'marche';

export const SITE_VIEWS: Record<SiteViewKey, [number, number, number, number, number, number]> = {
  iso: [0, 0, 0, -0.6, 0.7, 560],
  top: [0, 0, 0, 0, 1.52, 760],
  hotel: [205, 0, -75, -2.3, 0.45, 200],
  ecole: [-150, 0, -70, -0.6, 0.5, 170],
  rue: [-60, 2, -30, -0.5, 0.07, 70],
  // Vues complémentaires pour les préréglages propres à la simulation
  base: [216, 0, -192, -0.6, 0.5, 170],
  marche: [118, 0, 38, -0.6, 0.5, 130],
};

// ---------------------------------------------------------------------------
// Rendu : renderer, éclairage, groupe de maillages
// ---------------------------------------------------------------------------

export function isDarkScheme(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function createSiteRenderer(): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // three r128 (HTML) n'applique aucune conversion de sortie.
  r.outputColorSpace = THREE.LinearSRGBColorSpace;
  return r;
}

export function createSiteScene(): { scene: THREE.Scene; sun: THREE.DirectionalLight } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color().setHex(isDarkScheme() ? 0x14181c : 0xdfe8f0, THREE.LinearSRGBColorSpace);

  // r128 multipliait implicitement les lumières ponctuelles/hémisphériques par π.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f78, 0.75 * Math.PI);
  hemi.color.setHex(0xffffff, THREE.LinearSRGBColorSpace);
  hemi.groundColor.setHex(0x8a8f78, THREE.LinearSRGBColorSpace);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 0.9 * Math.PI);
  sun.color.setHex(0xfff4e0, THREE.LinearSRGBColorSpace);
  sun.position.set(-250, 350, 200);
  sun.castShadow = false;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -330;
  sc.right = 330;
  sc.top = 330;
  sc.bottom = -330;
  sc.near = 10;
  sc.far = 1200;
  scene.add(sun);

  return { scene, sun };
}

/** Construit un groupe de maillages (géométries et matériaux partagés avec le cache). */
export function createSiteGroup(model: SiteModelData): { group: THREE.Group; byMaterial: Record<string, THREE.Mesh> } {
  const group = new THREE.Group();
  const byMaterial: Record<string, THREE.Mesh> = {};
  for (const [name, geo] of Object.entries(model.geometries)) {
    const mesh = new THREE.Mesh(geo, model.materials[name]);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = { siteMaterial: name };
    group.add(mesh);
    byMaterial[name] = mesh;
  }
  return { group, byMaterial };
}

export function setShadows(
  renderer: THREE.WebGLRenderer,
  sun: THREE.DirectionalLight,
  model: SiteModelData,
  enabled: boolean
) {
  renderer.shadowMap.enabled = enabled;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sun.castShadow = enabled;
  Object.values(model.materials).forEach((m) => {
    m.needsUpdate = true;
  });
}

// ---------------------------------------------------------------------------
// Contrôle orbital identique au HTML (orbite, Maj+glisser / clic droit = déplacer, molette = zoom)
// ---------------------------------------------------------------------------

export class SiteOrbit {
  tgt = new THREE.Vector3();
  az = -0.6;
  el = 0.7;
  dist = 560;
  onChange: () => void = () => {};
  private drag: { x: number; y: number; pan: boolean } | null = null;

  constructor(private el_: HTMLElement) {
    el_.style.touchAction = 'none';
    el_.addEventListener('contextmenu', this.onContext);
    el_.addEventListener('pointerdown', this.onDown);
    el_.addEventListener('pointerup', this.onUp);
    el_.addEventListener('pointermove', this.onMove);
    el_.addEventListener('wheel', this.onWheel, { passive: false });
  }

  setView(key: SiteViewKey) {
    const v = SITE_VIEWS[key] || SITE_VIEWS.iso;
    this.tgt.set(v[0], v[1], v[2]);
    this.az = v[3];
    this.el = v[4];
    this.dist = v[5];
    this.onChange();
  }

  apply(cam: THREE.PerspectiveCamera) {
    const { tgt, az, el, dist } = this;
    cam.position.set(
      tgt.x + dist * Math.cos(el) * Math.sin(az),
      tgt.y + dist * Math.sin(el),
      tgt.z + dist * Math.cos(el) * Math.cos(az)
    );
    cam.lookAt(tgt);
  }

  private onContext = (e: Event) => e.preventDefault();
  private onDown = (e: PointerEvent) => {
    this.drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 };
    this.el_.setPointerCapture(e.pointerId);
  };
  private onUp = () => {
    this.drag = null;
  };
  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.pan) {
      const s = this.dist * 0.0015;
      this.tgt.x -= dx * Math.cos(this.az) * s;
      this.tgt.z += dx * Math.sin(this.az) * s;
      this.tgt.x += dy * Math.sin(this.az) * s;
      this.tgt.z += dy * Math.cos(this.az) * s;
    } else {
      this.az -= dx * 0.005;
      this.el = Math.min(1.55, Math.max(0.03, this.el + dy * 0.005));
    }
    this.onChange();
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.dist = Math.min(1500, Math.max(15, this.dist * (1 + Math.sign(e.deltaY) * 0.1)));
    this.onChange();
  };

  dispose() {
    const el = this.el_;
    el.removeEventListener('contextmenu', this.onContext);
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('wheel', this.onWheel);
  }
}

/** Étiquette en sprite (mêmes dimensions de texte pour toutes les vues 3D). */
export function createLabelSprite(text: string, scale = 1): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = 'rgba(255,255,255,0.88)';
    g.strokeStyle = '#64748b';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(8, 24, 496, 80, 14);
    g.fill();
    g.stroke();
    g.font = 'bold 44px sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#111827';
    g.fillText(text, 256, 78);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(64 * scale, 16 * scale, 1);
  s.renderOrder = 10;
  return s;
}

// ---------------------------------------------------------------------------
// Fond de plan 2D : rendu du dessus du modèle, calé sur le domaine de simulation
// (500 × 400 m) pour que les éditeurs SVG en coordonnées de simulation s'y superposent.
// ---------------------------------------------------------------------------

let planImagePromise: Promise<string> | null = null;

export function getSitePlanImage(width = 1500, height = 1200): Promise<string> {
  if (planImagePromise) return planImagePromise;
  planImagePromise = (async () => {
    const model = await loadSiteModel();
    const { scene } = createSiteScene();
    const { group } = createSiteGroup(model);
    group.children.forEach((c) => ((c as THREE.Mesh).castShadow = (c as THREE.Mesh).receiveShadow = false));
    scene.add(group);

    // Caméra centrée sur le modèle ; bornes relatives à la position de la caméra
    const cam = new THREE.OrthographicCamera(-MODEL_W / 2, MODEL_W / 2, MODEL_D / 2, -MODEL_D / 2, 1, 2000);
    cam.up.set(0, 0, -1);
    cam.position.set(MODEL_CENTER.x, 600, MODEL_CENTER.z);
    cam.lookAt(MODEL_CENTER.x, 0, MODEL_CENTER.z);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    const renderer = createSiteRenderer();
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
    renderer.dispose();
    renderer.forceContextLoss();
    return url;
  })();
  planImagePromise.catch(() => {
    planImagePromise = null;
  });
  return planImagePromise;
}
