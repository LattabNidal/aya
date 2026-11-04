/**
 * Cite3D Unified Master Spatial Data
 * Contains exact geometric coordinates, islands, lanes, buildings, gardens,
 * trees, and labels from the cite3d model for both 2D and 3D visualizers.
 */

export const S = 0.1;
export const CX = 365;
export const CY = 350;
export const FLOOR = 0.34;
export const CURB = 0.1;

export const X = (px: number) => (px - CX) * S;
export const Z = (py: number) => (py - CY) * S;
export const rad = (d: number) => (d * Math.PI) / 180;

// Coordinate transformation between simulation meters [0..500, 0..400] and Cite3D pixels [40..710, 60..690]
export const SIM_W = 500;
export const SIM_H = 400;
export const PX_MIN_X = 60;
export const PX_MAX_X = 700;
export const PX_MIN_Y = 70;
export const PX_MAX_Y = 680;

export function simToPx(simX: number, simY: number): { px: number; py: number } {
  const px = PX_MIN_X + (Math.max(0, Math.min(SIM_W, simX)) / SIM_W) * (PX_MAX_X - PX_MIN_X);
  const py = PX_MIN_Y + (Math.max(0, Math.min(SIM_H, simY)) / SIM_H) * (PX_MAX_Y - PX_MIN_Y);
  return { px, py };
}

export function pxToSim(px: number, py: number): { simX: number; simY: number } {
  const simX = Math.round(Math.max(0, Math.min(SIM_W, ((px - PX_MIN_X) / (PX_MAX_X - PX_MIN_X)) * SIM_W)));
  const simY = Math.round(Math.max(0, Math.min(SIM_H, ((py - PX_MIN_Y) / (PX_MAX_Y - PX_MIN_Y)) * SIM_H)));
  return { simX, simY };
}

export function simTo3D(simX: number, simY: number, elevation: number = CURB + 0.35): { x: number; y: number; z: number } {
  const { px, py } = simToPx(simX, simY);
  return { x: X(px), y: elevation, z: Z(py) };
}

export function threeToSim(threeX: number, threeZ: number): { simX: number; simY: number } {
  const px = threeX / S + CX;
  const py = threeZ / S + CY;
  return pxToSim(px, py);
}

// PRNG for consistent tree placement
export function createRnd(seedInit = 7) {
  let seed = seedInit;
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 7 Îlots : pelouse verte avec bordure surélevée
export const CITE_ISLANDS: [number, number][][] = [
  [[120, 75], [330, 135], [335, 215], [250, 225], [105, 195]],
  [[350, 150], [520, 185], [560, 260], [500, 280], [345, 215]],
  [[100, 215], [320, 230], [325, 420], [270, 500], [95, 490]],
  [[330, 260], [515, 310], [520, 540], [420, 545], [335, 430]],
  [[580, 230], [705, 250], [705, 330], [585, 335]],
  [[585, 385], [705, 385], [710, 600], [585, 610]],
  [[40, 520], [500, 590], [500, 690], [45, 690]]
];

export function inPoly(p: [number, number][], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// 7 Ruelles : [points...], largeur en px
export const CITE_LANES: [[number, number][], number][] = [
  [[[262, 262], [262, 418]], 12],
  [[[100, 303], [255, 303]], 8],
  [[[150, 215], [320, 235]], 8],
  [[[340, 428], [515, 428]], 10],
  [[[452, 315], [452, 428]], 8],
  [[[498, 400], [498, 545]], 10],
  [[[595, 328], [700, 328]], 8]
];

export function distSeg(px: number, py: number, [x1, y1]: [number, number], [x2, y2]: [number, number]): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Immeubles : [cx, cy, largeur, profondeur, angle°, étages, couleur?]
export const BRICK_COLOR = 0xd2b48c;
export const WHITE_COLOR = 0xf5f5f5;
export const GREY_COLOR = 0x9a9a9a;

export interface CiteBuildingDef {
  id: string;
  name: string;
  cx: number;
  cy: number;
  w: number;
  d: number;
  angle: number;
  floors: number;
  color?: number;
}

export const CITE_BUILDINGS_RAW: [number, number, number, number, number, number, number?][] = [
  [165, 95, 60, 24, 25, 5],
  [220, 115, 55, 24, 25, 6],
  [272, 128, 55, 24, 25, 5],
  [305, 140, 35, 22, 25, 4],
  [395, 182, 110, 30, 28, 8],
  [480, 215, 60, 28, 35, 8],
  [525, 245, 26, 50, 80, 7],
  [150, 180, 45, 20, 0, 3],
  [205, 195, 40, 22, 0, 4],
  [290, 205, 45, 22, 10, 3],
  [145, 265, 70, 55, 0, 3, WHITE_COLOR], // École Bousherit
  [210, 262, 45, 60, 0, 3, WHITE_COLOR], // École Bousherit annexe
  [70, 250, 22, 45, 0, 5],
  [65, 360, 22, 70, 0, 5],
  [130, 350, 18, 70, 0, 4],
  [185, 345, 80, 14, 0, 3],
  [190, 390, 60, 14, 0, 3],
  [300, 350, 18, 80, 0, 6],
  [300, 285, 40, 18, 0, 4],
  [160, 420, 100, 18, 25, 4],
  [245, 462, 90, 18, 25, 4],
  [145, 490, 90, 20, 25, 5],
  [215, 505, 60, 18, 25, 4],
  [300, 545, 150, 20, 25, 5],
  [390, 570, 120, 20, 25, 6],
  [285, 600, 170, 22, 25, 5],
  [170, 635, 110, 22, 25, 4],
  [330, 640, 110, 22, 25, 5],
  [375, 300, 18, 70, 0, 6],
  [355, 395, 20, 60, 0, 5],
  [395, 360, 40, 18, 0, 4],
  [420, 300, 50, 18, 0, 4],
  [490, 290, 40, 16, 0, 3],
  [480, 385, 18, 60, 0, 5],
  [395, 465, 50, 40, 0, 5],
  [460, 515, 20, 80, 0, 5],
  [525, 420, 36, 190, 0, 11], // Grande barre 11 étages
  [515, 340, 36, 60, 0, 9],
  [595, 520, 30, 120, 0, 6],
  [640, 610, 60, 22, 15, 5],
  [600, 640, 35, 55, 0, 4],
  [455, 610, 70, 20, 25, 4],
  [500, 640, 25, 50, 0, 6],
  [630, 262, 70, 22, 35, 4],
  [675, 365, 85, 20, 25, 4],
  [620, 285, 22, 40, 0, 4],
  [690, 448, 75, 110, 0, 2, GREY_COLOR] // CEM Amar
];

export const CITE_BUILDINGS: CiteBuildingDef[] = CITE_BUILDINGS_RAW.map((b, i) => {
  const [cx, cy, w, d, angle, floors, color] = b;
  let name = `Immeuble Résidentiel #${i + 1} (R+${floors})`;
  if (i === 10) name = 'École Bousherit Belehreche (Bâtiment Principal)';
  else if (i === 11) name = 'École Bousherit (Cour & Annexe)';
  else if (i === 36) name = 'Grande Barre Collective 11 Étages (Front Est)';
  else if (i === 46) name = 'CEM Amar (Enseignement Moyen)';
  return {
    id: `cite_bld_${i + 1}`,
    name,
    cx,
    cy,
    w,
    d,
    angle,
    floors,
    color: color || BRICK_COLOR
  };
});

export function nearBuilding(px: number, py: number, m: number): boolean {
  for (let i = 0; i < CITE_BUILDINGS_RAW.length; i++) {
    const [cx, cy, w, d, a] = CITE_BUILDINGS_RAW[i];
    const dx = px - cx;
    const dy = py - cy;
    // Fast axis-aligned bounding box pre-filter before trigonometry
    const maxHalfDim = (w > d ? w : d) * 0.72 + m;
    if (Math.abs(dx) > maxHalfDim || Math.abs(dy) > maxHalfDim) {
      continue;
    }
    const c = Math.cos(rad(a));
    const s = Math.sin(rad(a));
    if (Math.abs(dx * c + dy * s) < w / 2 + m && Math.abs(-dx * s + dy * c) < d / 2 + m) {
      return true;
    }
  }
  return false;
}

// Jardins : [cx, cy, largeur, profondeur]
export const CITE_GARDENS: [number, number, number, number][] = [
  [225, 322, 50, 18],
  [445, 470, 45, 30],
  [385, 505, 50, 28],
  [110, 556, 70, 30],
  [655, 545, 50, 50],
  [665, 308, 40, 22]
];

export function inGarden(x: number, y: number): boolean {
  return CITE_GARDENS.some(([cx, cy, w, d]) => Math.abs(x - cx) < w / 2 + 4 && Math.abs(y - cy) < d / 2 + 4);
}

// 260 Arbres pré-générés avec seed fixe
export function generateCiteTreeSpots(): [number, number][] {
  const rnd = createRnd(7);
  const spots: [number, number][] = [];
  let tries = 0;
  while (spots.length < 260 && tries++ < 20000) {
    const px = 40 + rnd() * 680;
    const py = 60 + rnd() * 630;
    if (!CITE_ISLANDS.some((p) => inPoly(p, px, py))) continue;
    if (nearBuilding(px, py, 7) || inGarden(px, py)) continue;
    if (CITE_LANES.some(([pts, w]) => pts.slice(1).some((p, i) => distSeg(px, py, pts[i], p) < w / 2 + 4))) continue;
    spots.push([px, py]);
  }
  return spots;
}

export const CITE_TREE_SPOTS = generateCiteTreeSpots();

// Étiquettes repères
export interface CiteLabelDef {
  text: string;
  px: number;
  py: number;
  y3d: number;
}

export const CITE_LABELS: CiteLabelDef[] = [
  { text: 'École Bousherit', px: 160, py: 265, y3d: 3.4 },
  { text: 'Mosquée', px: 625, py: 420, y3d: 4.6 },
  { text: 'CEM Amar', px: 690, py: 448, y3d: 3.2 },
  { text: 'Base de vie chinoise', px: 465, py: 60, y3d: 1.5 },
];

/**
 * Check if a simulation point (simX, simY) collides with any of the 47 Cite3D buildings.
 */
export function isCiteBuildingObstacle(simX: number, simY: number, bufferMeters: number = 2.0): boolean {
  const { px, py } = simToPx(simX, simY);
  // In Cite3D, 1px is approx 0.76m. Buffer in pixels:
  const bufferPx = bufferMeters / 0.76;
  return nearBuilding(px, py, bufferPx);
}

/**
 * Key gathering attractors in Cite3D plan
 */
export const CITE_ATTRACTORS = [
  { name: 'Marché Informel & Front Commercial', px: 525, py: 420, weight: 0.35 },
  { name: 'École Bousherit & Parvis', px: 160, py: 265, weight: 0.22 },
  { name: 'Grande Mosquée Esplanade', px: 625, py: 420, weight: 0.20 },
  { name: 'Cœur Central Îlot 3 Ruelles', px: 395, py: 360, weight: 0.15 },
  { name: 'Jardin & Promenades', px: 445, py: 470, weight: 0.08 },
];

/**
 * Get a valid walkable point along lanes or open island spaces avoiding all buildings.
 */
export function getRandomCiteWalkablePoint(prng: {
  nextFloat: () => number;
  nextInt: (min: number, max: number) => number;
}): { simX: number; simY: number } {
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    // 65% chance along one of the 7 pedestrian lanes
    if (prng.nextFloat() < 0.65) {
      const laneIdx = prng.nextInt(0, CITE_LANES.length - 1);
      const [pts, w] = CITE_LANES[laneIdx];
      const segIdx = prng.nextInt(0, pts.length - 2);
      const p1 = pts[segIdx];
      const p2 = pts[segIdx + 1];
      const t = prng.nextFloat();
      const bx = p1[0] + t * (p2[0] - p1[0]);
      const by = p1[1] + t * (p2[1] - p1[1]);
      // lateral offset
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const lat = (prng.nextFloat() - 0.5) * (w * 0.7);
      const px = bx + nx * lat;
      const py = by + ny * lat;
      if (!nearBuilding(px, py, 2)) {
        return pxToSim(px, py);
      }
    } else {
      // Pick within island polygon outside building
      const islandIdx = prng.nextInt(0, CITE_ISLANDS.length - 1);
      const poly = CITE_ISLANDS[islandIdx];
      // Bounding box of island
      let minX = 999, maxX = -999, minY = 999, maxY = -999;
      for (const [ix, iy] of poly) {
        if (ix < minX) minX = ix;
        if (ix > maxX) maxX = ix;
        if (iy < minY) minY = iy;
        if (iy > maxY) maxY = iy;
      }
      const testPx = minX + prng.nextFloat() * (maxX - minX);
      const testPy = minY + prng.nextFloat() * (maxY - minY);
      if (inPoly(poly, testPx, testPy) && !nearBuilding(testPx, testPy, 3)) {
        return pxToSim(testPx, testPy);
      }
    }
  }
  // Default safe courtyard coordinate in Îlot 3
  return pxToSim(262, 340);
}

/**
 * Daily Cycles: Pedestrian flow surge at three peak hours: 9:00 AM, 1:00 PM, and 6:00 PM.
 * Step 0 = 09:00, Step 240 = 13:00, Step 540 = 18:00
 */
export function getDailyPeakHourSurge(step: number): {
  flowSurge: number;
  activePeak: '09:00 (Matin)' | '13:00 (Midi)' | '18:00 (Soir)' | null;
} {
  // Peak 1: 09:00 AM (step 0 to 45) -> Morning school dropoff & market opening
  if (step <= 45) {
    const intensity = 1.0 - step / 45;
    return {
      flowSurge: 1.0 + 0.85 * intensity,
      activePeak: '09:00 (Matin)',
    };
  }
  // Peak 2: 13:00 (1:00 PM, step 210 to 270) -> Midday prayer, lunch, informal market peak
  if (step >= 210 && step <= 270) {
    const distFromPeak = Math.abs(step - 240);
    const intensity = Math.max(0, 1.0 - distFromPeak / 30);
    return {
      flowSurge: 1.0 + 1.15 * intensity,
      activePeak: '13:00 (Midi)',
    };
  }
  // Peak 3: 18:00 (6:00 PM, step 495 to 540) -> Evening family gatherings & collective outdoor socialization
  if (step >= 495) {
    const intensity = (step - 495) / 45;
    return {
      flowSurge: 1.0 + 0.95 * intensity,
      activePeak: '18:00 (Soir)',
    };
  }
  return {
    flowSurge: 1.0,
    activePeak: null,
  };
}

