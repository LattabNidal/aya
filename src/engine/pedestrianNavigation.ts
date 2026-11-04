/**
 * UrbanResilience SimLab - Pedestrian Waypoint Navigation Network (OCCSIM Framework)
 * Reconstructs authentic human pedestrian circulation across Cite3D UV9 Ali Mendjeli:
 * 1. Street Corridors & Boulevards (Rue A, Rue Nord, Rue Sud, Boulevard Est, Boulevard Ouest)
 * 2. Pedestrian Ruelles & Venelles (The 7 inter-block lanes connecting courtyards)
 * 3. Public Hubs & Meeting Spaces (Informal Market, École Bousherit, Grande Mosquée, CEM Amar)
 * 4. Strict Building Collision Avoidance: Paths strictly follow open street center-lines.
 * 5. Dynamic Human Paths: Agents (both infected and healthy) navigate between urban hubs.
 */

import { Point } from '../types/simulation';
import { nearBuilding, pxToSim, simToPx } from '../data/cite3dData';

export interface PedestrianNode {
  id: string;
  px: number;
  py: number;
  simX: number;
  simY: number;
  name: string;
  category: 'street' | 'ruelle' | 'hub' | 'plaza';
}

// Master list of collision-free pedestrian waypoints across Cite3D
const RAW_NODES: Array<{ id: string; px: number; py: number; name: string; category: PedestrianNode['category'] }> = [
  // --- A. Rue Nord (devant Base de Vie Chinoise) ---
  { id: 'N_OUEST', px: 80, py: 50, name: 'Rue Nord Ouest', category: 'street' },
  { id: 'N_CENTRE_OUEST', px: 220, py: 50, name: 'Rue Nord Centre-Ouest', category: 'street' },
  { id: 'N_ROND_POINT', px: 365, py: 45, name: 'Rond-Point Nord (Base Chinoise)', category: 'hub' },
  { id: 'N_CENTRE_EST', px: 490, py: 55, name: 'Rue Nord Centre-Est', category: 'street' },
  { id: 'N_EST', px: 640, py: 70, name: 'Rue Nord Est', category: 'street' },

  // --- B. Giratoire & Entrée Rue A ---
  { id: 'ROND_SUD', px: 365, py: 110, name: 'Carrefour Giratoire Nord', category: 'street' },

  // --- C. Rue A (Grande Artère Commerciale Centrale Nord-Sud) ---
  { id: 'A_NORD', px: 365, py: 175, name: 'Rue A Nord (Inter-îlots 1-2)', category: 'street' },
  { id: 'A_CROISEMENT_RUELLE3', px: 350, py: 240, name: 'Rue A Croisement Ruelle Nord', category: 'street' },
  { id: 'A_CENTRE', px: 335, py: 320, name: 'Rue A Centre Commercial', category: 'street' },
  { id: 'A_MARCHE_OUEST', px: 335, py: 428, name: 'Rue A Entrée Ouest Marché Informel', category: 'hub' },
  { id: 'A_SUD_MARCHE', px: 335, py: 500, name: 'Rue A Sud Marché', category: 'street' },
  { id: 'A_SORTIE_SUD', px: 345, py: 580, name: 'Rue A Carrefour Sud', category: 'street' },
  { id: 'A_TERMINUS', px: 350, py: 660, name: 'Rue A Terminus Sud', category: 'street' },

  // --- D. Boulevard Ouest ---
  { id: 'O_NORD', px: 65, py: 110, name: 'Boulevard Ouest Nord', category: 'street' },
  { id: 'O_CENTRE_NORD', px: 65, py: 210, name: 'Boulevard Ouest Îlot 1', category: 'street' },
  { id: 'O_ECOLE', px: 65, py: 303, name: 'Boulevard Ouest Parvis École', category: 'street' },
  { id: 'O_CENTRE_SUD', px: 65, py: 420, name: 'Boulevard Ouest Îlot 3', category: 'street' },
  { id: 'O_SUD', px: 65, py: 530, name: 'Boulevard Ouest Sud-Ouest', category: 'street' },
  { id: 'O_TERMINUS', px: 65, py: 660, name: 'Boulevard Ouest Terminus', category: 'street' },

  // --- E. Boulevard Est (Hôtel, Mosquée, CEM Amar) ---
  { id: 'E_NORD', px: 560, py: 140, name: 'Boulevard Est Nord', category: 'street' },
  { id: 'E_HOTEL', px: 560, py: 230, name: 'Boulevard Est Face Hôtel', category: 'hub' },
  { id: 'E_CENTRE', px: 560, py: 330, name: 'Boulevard Est Carrefour Mosquée', category: 'street' },
  { id: 'E_MOSQUEE', px: 560, py: 420, name: 'Boulevard Est Parvis Grande Mosquée', category: 'hub' },
  { id: 'E_CEM', px: 565, py: 520, name: 'Boulevard Est Face CEM Amar', category: 'hub' },
  { id: 'E_SUD', px: 570, py: 600, name: 'Boulevard Est Sud', category: 'street' },
  { id: 'E_TERMINUS', px: 570, py: 660, name: 'Boulevard Est Terminus', category: 'street' },

  // --- F. Avenue Sud (Axe Transversal Sud) ---
  { id: 'S_OUEST', px: 150, py: 660, name: 'Avenue Sud Ouest', category: 'street' },
  { id: 'S_CENTRE_OUEST', px: 250, py: 660, name: 'Avenue Sud Centre-Ouest', category: 'street' },
  { id: 'S_CENTRE_EST', px: 460, py: 660, name: 'Avenue Sud Centre-Est', category: 'street' },
  { id: 'S_EST', px: 650, py: 660, name: 'Avenue Sud Est', category: 'street' },

  // --- G. Traverse Nord-Ouest (entre Îlot 1 et École) ---
  { id: 'T_NW_1', px: 110, py: 175, name: 'Traverse Nord-Ouest Entrée', category: 'ruelle' },
  { id: 'T_NW_2', px: 220, py: 185, name: 'Traverse Nord-Ouest Milieu', category: 'ruelle' },

  // --- H. Réseau des 7 Ruelles Piétonnes CITE_LANES ---
  // Ruelle 1 (Allée École Centrale)
  { id: 'L1_NORD', px: 262, py: 262, name: 'Ruelle École Nord', category: 'ruelle' },
  { id: 'L1_CENTRE', px: 262, py: 340, name: 'Cour Intérieure École', category: 'plaza' },
  { id: 'L1_SUD', px: 262, py: 418, name: 'Ruelle École Sud', category: 'ruelle' },

  // Ruelle 2 (Traverse École Ouest)
  { id: 'L2_OUEST', px: 100, py: 303, name: 'Ruelle Traverse Ouest', category: 'ruelle' },
  { id: 'L2_CENTRE', px: 180, py: 303, name: 'Parvis École Bousherit', category: 'hub' },
  { id: 'L2_EST', px: 255, py: 303, name: 'Croisement Ruelles École', category: 'ruelle' },

  // Ruelle 3 (Allée Nord Îlot 3)
  { id: 'L3_OUEST', px: 150, py: 215, name: 'Allée Nord Îlot 3 Ouest', category: 'ruelle' },
  { id: 'L3_CENTRE', px: 240, py: 225, name: 'Allée Nord Îlot 3 Centre', category: 'ruelle' },
  { id: 'L3_EST', px: 320, py: 235, name: 'Sortie Allée Nord sur Rue A', category: 'ruelle' },

  // Ruelle 4 (Traverse Marché Informel Est-Ouest)
  { id: 'L4_OUEST', px: 340, py: 428, name: 'Marché Informel Accès Ouest', category: 'hub' },
  { id: 'L4_CENTRE', px: 425, py: 428, name: 'Cœur du Marché Informel (Étals)', category: 'hub' },
  { id: 'L4_EST', px: 515, py: 428, name: 'Marché Informel Accès Est', category: 'hub' },

  // Ruelle 5 (Corridor Nord Marché)
  { id: 'L5_NORD', px: 452, py: 315, name: 'Corridor Résidentiel Nord Marché', category: 'ruelle' },
  { id: 'L5_CENTRE', px: 452, py: 370, name: 'Cour Résidentielle Îlot 4', category: 'plaza' },

  // Ruelle 6 (Promenade Sud Marché & Jardin)
  { id: 'L6_NORD', px: 498, py: 400, name: 'Promenade Marché Sud', category: 'ruelle' },
  { id: 'L6_CENTRE', px: 498, py: 475, name: 'Jardin & Allée Ombragée Îlot 4', category: 'plaza' },
  { id: 'L6_SUD', px: 498, py: 545, name: 'Sortie Ruelle Sud sur Avenue', category: 'ruelle' },

  // Ruelle 7 (Allée Mosquée - CEM Amar)
  { id: 'L7_OUEST', px: 595, py: 328, name: 'Allée Piétonne Mosquée Ouest', category: 'ruelle' },
  { id: 'L7_CENTRE', px: 650, py: 328, name: 'Esplanade Grande Mosquée & Minaret', category: 'plaza' },
  { id: 'L7_EST', px: 700, py: 328, name: 'Accès CEM Amar & Logements', category: 'hub' },

  // --- I. Hubs Majeurs Extérieurs ---
  { id: 'HOTEL_PLAZA', px: 630, py: 240, name: 'Parvis Hôtel & Jardin', category: 'plaza' },
  { id: 'MOSQUE_COURT', px: 625, py: 420, name: 'Cour de Prière Mosquée', category: 'hub' },
];

export const PEDESTRIAN_NODES: PedestrianNode[] = RAW_NODES.map((n) => {
  const { simX, simY } = pxToSim(n.px, n.py);
  return {
    ...n,
    simX,
    simY,
  };
});

// Map of node by id
const NODES_MAP = new Map<string, PedestrianNode>();
PEDESTRIAN_NODES.forEach((n) => NODES_MAP.set(n.id, n));

// Bidirectional network edges (connections along open streets & ruelles)
const NETWORK_EDGES: [string, string][] = [
  // Rue Nord
  ['N_OUEST', 'N_CENTRE_OUEST'],
  ['N_CENTRE_OUEST', 'N_ROND_POINT'],
  ['N_ROND_POINT', 'N_CENTRE_EST'],
  ['N_CENTRE_EST', 'N_EST'],
  ['N_ROND_POINT', 'ROND_SUD'],
  ['ROND_SUD', 'A_NORD'],

  // Rue A (Grande artère centrale)
  ['A_NORD', 'A_CROISEMENT_RUELLE3'],
  ['A_CROISEMENT_RUELLE3', 'A_CENTRE'],
  ['A_CENTRE', 'A_MARCHE_OUEST'],
  ['A_MARCHE_OUEST', 'A_SUD_MARCHE'],
  ['A_SUD_MARCHE', 'A_SORTIE_SUD'],
  ['A_SORTIE_SUD', 'A_TERMINUS'],

  // Boulevard Ouest
  ['N_OUEST', 'O_NORD'],
  ['O_NORD', 'O_CENTRE_NORD'],
  ['O_CENTRE_NORD', 'O_ECOLE'],
  ['O_ECOLE', 'O_CENTRE_SUD'],
  ['O_CENTRE_SUD', 'O_SUD'],
  ['O_SUD', 'O_TERMINUS'],
  ['O_TERMINUS', 'S_OUEST'],

  // Boulevard Est
  ['N_EST', 'E_NORD'],
  ['E_NORD', 'E_HOTEL'],
  ['E_HOTEL', 'E_CENTRE'],
  ['E_CENTRE', 'E_MOSQUEE'],
  ['E_MOSQUEE', 'E_CEM'],
  ['E_CEM', 'E_SUD'],
  ['E_SUD', 'E_TERMINUS'],
  ['E_TERMINUS', 'S_EST'],

  // Avenue Sud
  ['S_OUEST', 'S_CENTRE_OUEST'],
  ['S_CENTRE_OUEST', 'A_TERMINUS'],
  ['A_TERMINUS', 'S_CENTRE_EST'],
  ['S_CENTRE_EST', 'E_TERMINUS'],
  ['E_TERMINUS', 'S_EST'],

  // Traverse Nord-Ouest
  ['O_CENTRE_NORD', 'T_NW_1'],
  ['T_NW_1', 'T_NW_2'],
  ['T_NW_2', 'A_CROISEMENT_RUELLE3'],

  // Ruelles École (L1 & L2)
  ['O_ECOLE', 'L2_OUEST'],
  ['L2_OUEST', 'L2_CENTRE'],
  ['L2_CENTRE', 'L2_EST'],
  ['L2_EST', 'L1_CENTRE'],
  ['L1_NORD', 'L1_CENTRE'],
  ['L1_CENTRE', 'L1_SUD'],
  ['L1_NORD', 'T_NW_2'],
  ['L1_SUD', 'O_CENTRE_SUD'],

  // Ruelle 3 (Nord Îlot 3)
  ['L2_CENTRE', 'L3_OUEST'],
  ['L3_OUEST', 'L3_CENTRE'],
  ['L3_CENTRE', 'L3_EST'],
  ['L3_EST', 'A_CROISEMENT_RUELLE3'],

  // Ruelle 4 & 5 (Marché Informel & Cour Centrale)
  ['A_MARCHE_OUEST', 'L4_OUEST'],
  ['L4_OUEST', 'L4_CENTRE'],
  ['L4_CENTRE', 'L4_EST'],
  ['L4_EST', 'E_MOSQUEE'],
  ['E_HOTEL', 'L5_NORD'],
  ['L5_NORD', 'L5_CENTRE'],
  ['L5_CENTRE', 'L4_CENTRE'],

  // Ruelle 6 (Promenade Sud Marché & Jardin)
  ['L4_CENTRE', 'L6_NORD'],
  ['L6_NORD', 'L6_CENTRE'],
  ['L6_CENTRE', 'L6_SUD'],
  ['L6_SUD', 'S_CENTRE_EST'],

  // Ruelle 7 & Mosquée / CEM
  ['E_CENTRE', 'L7_OUEST'],
  ['L7_OUEST', 'L7_CENTRE'],
  ['L7_CENTRE', 'L7_EST'],
  ['L7_CENTRE', 'MOSQUE_COURT'],
  ['E_MOSQUEE', 'MOSQUE_COURT'],
  ['E_HOTEL', 'HOTEL_PLAZA'],
];

// Precompute graph adjacency list
const GRAPH = new Map<string, string[]>();
PEDESTRIAN_NODES.forEach((n) => GRAPH.set(n.id, []));
NETWORK_EDGES.forEach(([u, v]) => {
  GRAPH.get(u)?.push(v);
  GRAPH.get(v)?.push(u);
});

/**
 * Fast Breadth-First-Search shortest path between two pedestrian nodes
 */
export function findNodePath(startId: string, targetId: string): string[] {
  if (startId === targetId) return [startId];
  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === targetId) {
      // Reconstruct path
      const path: string[] = [];
      let step: string | undefined = targetId;
      while (step) {
        path.unshift(step);
        step = parent.get(step);
      }
      return path;
    }

    const neighbors = GRAPH.get(curr) || [];
    for (const nxt of neighbors) {
      if (!visited.has(nxt)) {
        visited.add(nxt);
        parent.set(nxt, curr);
        queue.push(nxt);
      }
    }
  }

  return [startId, targetId];
}

/**
 * Finds the nearest pedestrian node to a simulation position (simX, simY)
 */
export function findNearestNode(simX: number, simY: number): PedestrianNode {
  let best = PEDESTRIAN_NODES[0];
  let minD = Infinity;
  for (let i = 0; i < PEDESTRIAN_NODES.length; i++) {
    const n = PEDESTRIAN_NODES[i];
    const dx = n.simX - simX;
    const dy = n.simY - simY;
    const d = dx * dx + dy * dy;
    if (d < minD) {
      minD = d;
      best = n;
    }
  }
  return best;
}

/**
 * Picks a random urban destination node (weighted by community hotspots: market, mosque, school, alleys)
 */
export function pickRandomUrbanDestination(
  prng: { nextFloat: () => number; nextInt: (min: number, max: number) => number },
  currentId?: string,
  demographic?: string
): PedestrianNode {
  // Hotspot candidates
  const marketNodes = ['L4_CENTRE', 'A_MARCHE_OUEST', 'L4_OUEST', 'L4_EST'];
  const schoolNodes = ['L2_CENTRE', 'L1_CENTRE', 'O_ECOLE'];
  const mosqueNodes = ['MOSQUE_COURT', 'L7_CENTRE', 'E_MOSQUEE'];
  const commercialNodes = ['A_CENTRE', 'A_NORD', 'A_CROISEMENT_RUELLE3'];
  const courtyardNodes = ['L5_CENTRE', 'L6_CENTRE', 'T_NW_2', 'HOTEL_PLAZA'];

  const roll = prng.nextFloat();
  let candidatePool = marketNodes;

  if (demographic === 'child') {
    // Children prefer school courtyards, alleys, and gardens
    candidatePool = roll < 0.5 ? schoolNodes : roll < 0.8 ? courtyardNodes : marketNodes;
  } else if (demographic === 'elderly') {
    // Elderly prefer quiet courtyards, mosque parvis, and market perimeter
    candidatePool = roll < 0.45 ? mosqueNodes : roll < 0.75 ? courtyardNodes : commercialNodes;
  } else {
    // Adults navigate widely between commercial avenue, market, and residential streets
    candidatePool = roll < 0.4 ? marketNodes : roll < 0.7 ? commercialNodes : roll < 0.85 ? mosqueNodes : schoolNodes;
  }

  const chosenId = candidatePool[prng.nextInt(0, candidatePool.length - 1)];
  if (chosenId === currentId) {
    // Pick another from the entire node list
    const altIdx = prng.nextInt(0, PEDESTRIAN_NODES.length - 1);
    return PEDESTRIAN_NODES[altIdx];
  }

  return NODES_MAP.get(chosenId) || PEDESTRIAN_NODES[0];
}

/**
 * Builds an authentic collision-free pedestrian route between a starting position and a destination
 */
export function buildPedestrianRoute(
  fromX: number,
  fromY: number,
  destNodeId?: string,
  prng?: { nextFloat: () => number; nextInt: (min: number, max: number) => number },
  demographic?: string
): { waypoints: Point[]; targetNodeId: string } {
  const startNode = findNearestNode(fromX, fromY);
  let targetId = destNodeId;

  if (!targetId && prng) {
    const dest = pickRandomUrbanDestination(prng, startNode.id, demographic);
    targetId = dest.id;
  }

  if (!targetId) targetId = 'L4_CENTRE';

  const nodeIds = findNodePath(startNode.id, targetId);
  const waypoints: Point[] = [];

  for (const nId of nodeIds) {
    const node = NODES_MAP.get(nId);
    if (node) {
      waypoints.push({ x: node.simX, y: node.simY });
    }
  }

  return { waypoints, targetNodeId: targetId };
}

export function getNodeById(id: string): PedestrianNode | undefined {
  return NODES_MAP.get(id);
}

/**
 * Spontaneous realistic human street choice at an intersection:
 * A human walking in a city reaches a corner and randomly chooses among the connected
 * streets and ruelles, avoiding immediate U-turns unless at a dead end.
 */
export function getRandomStreetNeighbor(
  currentNodeId: string,
  prevNodeId?: string,
  prng?: { nextFloat: () => number; nextInt: (min: number, max: number) => number }
): PedestrianNode {
  const neighbors = GRAPH.get(currentNodeId) || [];
  if (neighbors.length === 0) return NODES_MAP.get('A_CENTRE') || PEDESTRIAN_NODES[0];
  if (neighbors.length === 1) return NODES_MAP.get(neighbors[0]) || PEDESTRIAN_NODES[0];

  // Avoid immediate U-turn if forward choices exist
  const forwardChoices = prevNodeId ? neighbors.filter((n) => n !== prevNodeId) : neighbors;
  const pool = forwardChoices.length > 0 ? forwardChoices : neighbors;

  const chosenId = prng
    ? pool[prng.nextInt(0, pool.length - 1)]
    : pool[Math.floor(Math.random() * pool.length)];

  return NODES_MAP.get(chosenId) || PEDESTRIAN_NODES[0];
}
