/**
 * Navigation piétonne sur la géométrie réelle du modèle urbain.
 *
 * Les agents marchent sur les trottoirs, pavés, places, chaussées et pelouses du modèle
 * "Secteur – ville nouvelle". Les bâtiments, haies, troncs et mobilier sont des obstacles :
 * un agent ne peut ni entrer dans un immeuble ni longer un mur en le traversant.
 *
 * Principe : pour chaque destination, un champ de distance (Dijkstra) est calculé une seule fois
 * sur la grille de 1 m, avec un coût plus élevé sur la pelouse et près des murs. Chaque agent
 * descend ensuite ce champ par petits pas de 0,8 m, ce qui donne des trajets directs et naturels,
 * sans angles de grille, qui contournent les bâtiments.
 *
 * Repère : x, y de simulation en mètres = (x modèle + 260, z modèle + 263).
 */

import { WALK_MAP_B64, WALK_MAP_HEIGHT as NY, WALK_MAP_WIDTH as NX } from '../data/walkMapData';

export const CELL_BLOCKED = 0;
export const CELL_ROAD = 1;
export const CELL_PARKING = 2;
export const CELL_PAVED = 3;
export const CELL_GRASS = 4;

export const NAV_WIDTH = NX;
export const NAV_HEIGHT = NY;

const CLASS_COST = [Infinity, 1.35, 1.5, 1.0, 1.7];
const SUBSTEP = 0.8; // m
const DIRS: Array<[number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

// ---------------------------------------------------------------------------
// Décodage de la carte (une seule fois)
// ---------------------------------------------------------------------------

let cls: Uint8Array;
let canopy: Uint8Array;
let cost: Float32Array;
let ready = false;

function init() {
  if (ready) return;
  const bin = atob(WALK_MAP_B64);
  const total = NX * NY;
  const raw = new Uint8Array(total);
  let pos = 0;
  for (let i = 0; i + 2 < bin.length; i += 3) {
    const v = bin.charCodeAt(i);
    const len = bin.charCodeAt(i + 1) | (bin.charCodeAt(i + 2) << 8);
    raw.fill(v, pos, pos + len);
    pos += len;
  }
  cls = new Uint8Array(total);
  canopy = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    cls[i] = raw[i] & 7;
    canopy[i] = (raw[i] >> 3) & 1;
  }

  // Coût de base + pénalité à proximité des murs (les gens ne longent pas les façades)
  cost = new Float32Array(total);
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = y * NX + x;
      if (cls[i] === CELL_BLOCKED) {
        cost[i] = Infinity;
        continue;
      }
      let c = CLASS_COST[cls[i]];
      let wall1 = false;
      let wall2 = false;
      for (let dy = -2; dy <= 2 && !wall1; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const blocked = xx < 0 || yy < 0 || xx >= NX || yy >= NY || cls[yy * NX + xx] === CELL_BLOCKED;
          if (!blocked) continue;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            wall1 = true;
            break;
          }
          wall2 = true;
        }
      }
      if (wall1) c += 1.2;
      else if (wall2) c += 0.4;
      cost[i] = c;
    }
  }
  ready = true;
}

// ---------------------------------------------------------------------------
// Accès à la grille
// ---------------------------------------------------------------------------

const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < NX && y < NY;

export function isWalkable(x: number, y: number): boolean {
  init();
  if (!inside(x, y)) return false;
  return cls[Math.floor(y) * NX + Math.floor(x)] !== CELL_BLOCKED;
}

export function cellClass(x: number, y: number): number {
  init();
  if (!inside(x, y)) return CELL_BLOCKED;
  return cls[Math.floor(y) * NX + Math.floor(x)];
}

/** Sous un arbre ? (pour le microclimat) */
export function isUnderCanopy(x: number, y: number): boolean {
  init();
  return inside(x, y) && canopy[Math.floor(y) * NX + Math.floor(x)] === 1;
}

/**
 * Ombrage végétal pris en compte pour la contamination : couvert arboré du modèle.
 * Scénarios S1 et S4 : alignements d'arbres ajoutés le long de tous les trottoirs.
 */
export function isShadedByVegetation(x: number, y: number, scenarioId: string, additionalVegetation: boolean): boolean {
  init();
  if (!inside(x, y)) return false;
  const i = Math.floor(y) * NX + Math.floor(x);
  if (canopy[i] === 1) return true;
  if ((additionalVegetation || scenarioId === 'S1' || scenarioId === 'S4') && cls[i] === CELL_PAVED) return true;
  return false;
}

/** Case praticable la plus proche (recherche en spirale), centre de case. */
export function nearestWalkable(x: number, y: number, preferPaved = false): { x: number; y: number } {
  init();
  const cx = Math.max(0, Math.min(NX - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min(NY - 1, Math.floor(y)));
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let r = 0; r < 80; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = cx + dx;
        const yy = cy + dy;
        if (!inside(xx, yy)) continue;
        const c = cls[yy * NX + xx];
        if (c === CELL_BLOCKED) continue;
        if (preferPaved && c !== CELL_PAVED && c !== CELL_ROAD) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { x: xx + 0.5, y: yy + 0.5 };
        }
      }
    }
    if (best && r >= Math.sqrt(bestD)) break;
  }
  if (!best && preferPaved) return nearestWalkable(x, y, false);
  return best || { x: NX / 2, y: NY / 2 };
}

// ---------------------------------------------------------------------------
// Champs de distance (Dijkstra) mis en cache par destination
// ---------------------------------------------------------------------------

const fieldCache = new Map<number, Float32Array>();
let heapKeys: Float32Array | null = null;
let heapVals: Int32Array | null = null;

function buildField(destIdx: number): Float32Array {
  init();
  const total = NX * NY;
  const field = new Float32Array(total).fill(Infinity);
  if (!heapKeys) {
    heapKeys = new Float32Array(total * 6);
    heapVals = new Int32Array(total * 6);
  }
  const keys = heapKeys;
  const vals = heapVals!;
  let size = 0;

  const push = (k: number, v: number) => {
    let i = size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= k) break;
      keys[i] = keys[p];
      vals[i] = vals[p];
      i = p;
    }
    keys[i] = k;
    vals[i] = v;
  };
  const pop = () => {
    const rk = keys[0];
    const rv = vals[0];
    size--;
    if (size > 0) {
      const k = keys[size];
      const v = vals[size];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= size) break;
        if (c + 1 < size && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= k) break;
        keys[i] = keys[c];
        vals[i] = vals[c];
        i = c;
      }
      keys[i] = k;
      vals[i] = v;
    }
    popKey = rk;
    return rv;
  };
  let popKey = 0;

  field[destIdx] = 0;
  push(0, destIdx);
  while (size > 0) {
    const cur = pop();
    if (popKey > field[cur]) continue;
    const cx = cur % NX;
    const cy = (cur / NX) | 0;
    for (let d = 0; d < 8; d++) {
      const dx = DIRS[d][0];
      const dy = DIRS[d][1];
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
      const ni = ny * NX + nx;
      const nc = cost[ni];
      if (nc === Infinity) continue;
      if (d >= 4 && (cost[cy * NX + nx] === Infinity || cost[ny * NX + cx] === Infinity)) continue; // pas de coupe d'angle
      const nd = field[cur] + DIRS[d][2] * 0.5 * (cost[cur] + nc);
      if (nd < field[ni] - 1e-3) {
        field[ni] = nd;
        push(nd, ni);
      }
    }
  }
  return field;
}

export function getField(destX: number, destY: number): { field: Float32Array; idx: number } {
  init();
  const p = nearestWalkable(destX, destY);
  const idx = Math.floor(p.y) * NX + Math.floor(p.x);
  let field = fieldCache.get(idx);
  if (!field) {
    field = buildField(idx);
    fieldCache.set(idx, field);
  }
  return { field, idx };
}

// ---------------------------------------------------------------------------
// Déplacement
// ---------------------------------------------------------------------------

/** Distance restante (en m environ) jusqu'à la destination du champ. */
export function remainingDistance(field: Float32Array, x: number, y: number): number {
  if (!inside(x, y)) return Infinity;
  return field[Math.floor(y) * NX + Math.floor(x)];
}

function gradientDir(field: Float32Array, x: number, y: number): [number, number] | null {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  const f0 = field[cy * NX + cx];
  let gx = 0;
  let gy = 0;
  for (let d = 0; d < 8; d++) {
    const nx = cx + DIRS[d][0];
    const ny = cy + DIRS[d][1];
    if (!inside(nx, ny)) continue;
    const fn = field[ny * NX + nx];
    if (fn === Infinity) continue;
    if (d >= 4 && (cost[cy * NX + nx] === Infinity || cost[ny * NX + cx] === Infinity)) continue;
    const gain = f0 - fn;
    if (gain > 0) {
      gx += (DIRS[d][0] / DIRS[d][2]) * gain;
      gy += (DIRS[d][1] / DIRS[d][2]) * gain;
    }
  }
  const len = Math.hypot(gx, gy);
  if (len < 1e-6) return null;
  return [gx / len, gy / len];
}

/**
 * Avance de `distance` mètres vers la destination du champ, par pas de 0,8 m.
 * `lateral` (-1..1) décale légèrement la trajectoire pour que les gens ne marchent pas en file indienne.
 * Retourne la nouvelle position et la direction de marche.
 */
export function advance(
  field: Float32Array,
  x: number,
  y: number,
  distance: number,
  lateral = 0
): { x: number; y: number; dirX: number; dirY: number } {
  init();
  let px = x;
  let py = y;
  let lastDx = 0;
  let lastDy = 0;
  let remaining = distance;

  // Départ d'une case bloquée (ne devrait pas arriver) : ramener sur la case praticable la plus proche
  if (!isWalkable(px, py)) {
    const p = nearestWalkable(px, py);
    px = p.x;
    py = p.y;
  }

  while (remaining > 1e-3) {
    const step = Math.min(SUBSTEP, remaining);
    const g = gradientDir(field, px, py);
    if (!g) break; // arrivé (minimum local)
    let dx = g[0];
    let dy = g[1];

    // Biais latéral, seulement si la case visée reste praticable
    let moved = false;
    if (lateral !== 0) {
      const bx = dx - dy * lateral * 0.35;
      const by = dy + dx * lateral * 0.35;
      const bl = Math.hypot(bx, by) || 1;
      const tx = px + (bx / bl) * step;
      const ty = py + (by / bl) * step;
      if (isWalkable(tx, ty) && cost[Math.floor(ty) * NX + Math.floor(tx)] < 2.4) {
        px = tx;
        py = ty;
        dx = bx / bl;
        dy = by / bl;
        moved = true;
      }
    }
    if (!moved) {
      const tx = px + dx * step;
      const ty = py + dy * step;
      if (isWalkable(tx, ty)) {
        px = tx;
        py = ty;
      } else {
        // Contournement : essayer des directions tournées, sinon centre de la meilleure case voisine
        let ok = false;
        for (const ang of [0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          const rx = dx * ca - dy * sa;
          const ry = dx * sa + dy * ca;
          const ax = px + rx * step;
          const ay = py + ry * step;
          if (isWalkable(ax, ay)) {
            px = ax;
            py = ay;
            dx = rx;
            dy = ry;
            ok = true;
            break;
          }
        }
        if (!ok) break;
      }
    }
    lastDx = dx;
    lastDy = dy;
    remaining -= step;
  }
  return { x: px, y: py, dirX: lastDx, dirY: lastDy };
}

// ---------------------------------------------------------------------------
// Points d'intérêt, destinations et apparition
// ---------------------------------------------------------------------------

export type DestinationCategory = 'market' | 'school' | 'mosque' | 'commercial' | 'courtyard';

interface Anchor {
  x: number;
  y: number;
}

/** Points de passage répartis autour d'un lieu (anneaux successifs, cases praticables). */
function anchorsAround(cx: number, cy: number, radius: number, count: number, preferPaved = true): Anchor[] {
  init();
  const out: Anchor[] = [];
  const center = nearestWalkable(cx, cy, preferPaved);
  out.push(center);
  const rings = [radius * 0.5, radius];
  let k = 0;
  while (out.length < count && k < 64) {
    const r = rings[k % rings.length];
    const ang = (k * 2.399963) % (Math.PI * 2); // angle d'or
    const p = nearestWalkable(center.x + Math.cos(ang) * r, center.y + Math.sin(ang) * r, preferPaved);
    if (out.every((o) => Math.hypot(o.x - p.x, o.y - p.y) > radius * 0.3)) out.push(p);
    k++;
  }
  return out;
}

// Positions des lieux en repère simulation (= modèle + (260, 263)).
const POIS = {
  school: [{ x: 110, y: 193, r: 22 }],
  mosque: [
    { x: 453, y: 313, r: 22 },
    { x: 512, y: 325, r: 14 },
  ],
  commercial: [
    { x: 305, y: 245, r: 30 },
    { x: 476, y: 71, r: 18 },
    { x: 215, y: 260, r: 24 },
  ],
  courtyard: [
    { x: 150, y: 450, r: 40 },
    { x: 325, y: 50, r: 40 },
    { x: 165, y: 103, r: 24 },
    { x: 465, y: 208, r: 20 },
  ],
};

const anchorCache = new Map<string, Anchor[]>();

function categoryAnchors(cat: DestinationCategory, market: { x: number; y: number; width: number; height: number }): Anchor[] {
  const key = cat === 'market' ? `market:${market.x}:${market.y}:${market.width}:${market.height}` : cat;
  let list = anchorCache.get(key);
  if (list) return list;
  if (cat === 'market') {
    list = anchorsAround(market.x + market.width / 2, market.y + market.height / 2, Math.max(market.width, market.height) / 2, 5, true);
  } else {
    list = [];
    for (const p of POIS[cat]) list.push(...anchorsAround(p.x, p.y, p.r, 3, true));
  }
  anchorCache.set(key, list);
  return list;
}

interface PRNGLike {
  nextFloat: () => number;
  nextInt: (min: number, max: number) => number;
}

/** Choix d'une destination selon le profil (enfant, personne âgée, adulte), comme auparavant. */
export function pickDestination(
  prng: PRNGLike,
  demographic: string | undefined,
  market: { x: number; y: number; width: number; height: number },
  avoid?: { x: number; y: number }
): Anchor {
  const roll = prng.nextFloat();
  let cat: DestinationCategory;
  if (demographic === 'child') {
    cat = roll < 0.5 ? 'school' : roll < 0.8 ? 'courtyard' : 'market';
  } else if (demographic === 'elderly') {
    cat = roll < 0.45 ? 'mosque' : roll < 0.75 ? 'courtyard' : 'commercial';
  } else {
    cat = roll < 0.4 ? 'market' : roll < 0.7 ? 'commercial' : roll < 0.85 ? 'mosque' : 'school';
  }
  const list = categoryAnchors(cat, market);
  let a = list[prng.nextInt(0, list.length - 1)];
  if (avoid && Math.hypot(a.x - avoid.x, a.y - avoid.y) < 6) {
    a = list[(list.indexOf(a) + 1) % list.length];
  }
  return a;
}

/** Point d'apparition praticable (trottoirs et places en priorité). */
export function randomWalkablePoint(prng: PRNGLike): Anchor {
  init();
  for (let t = 0; t < 400; t++) {
    const x = prng.nextFloat() * NX;
    const y = prng.nextFloat() * NY;
    const c = cellClass(x, y);
    if (c === CELL_BLOCKED) continue;
    if (c === CELL_GRASS && prng.nextFloat() < 0.6) continue; // moins de gens sur les pelouses
    return { x, y };
  }
  return { x: NX / 2, y: NY / 2 };
}

/** Case praticable de la chaussée / trottoir la plus proche d'une porte d'entrée. */
export function gatePoint(x: number, y: number): Anchor {
  return nearestWalkable(x, y, true);
}
