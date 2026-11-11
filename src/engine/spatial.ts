/**
 * Spatial Model: Unité de Voisinage 9 (UV9) - Ville Nouvelle Ali Mendjeli, Constantine
 * Dimensions: 500m x 400m
 * High-fidelity morphological reconstruction based on CAD/site plan:
 * - Urban Blocks (Îlots 1 à 7 avec cours intérieures et trames cadastrales)
 * - Pedestrian Alleys & Venelles (Ruelles piétonnes en U, venelles transversales, promenades)
 * - Major Landmarks: École Bousherit Belehreche, Grande Mosquée, Hôtel & Bassin, CEM Amar, Front Commercial
 * - Stepped "M M M" housing bars, curved northern residential pair, and southwest slanted bars.
 */

import {
  Building,
  MarketZone,
  PedestrianAlley,
  Point,
  SpatialLayout,
  StreetCorridor,
  UrbanBlock,
  VegetationZone,
  VisitorGate,
} from '../types/simulation';

export const INITIAL_SPATIAL_LAYOUT: SpatialLayout = {
  width: 520, // 520 mètres (emprise du modèle urbain, repère simulation = modèle + (260, 263))
  height: 525, // 525 mètres
  note: 'Reconstruction exacte du plan de site UV9 Ali Mendjeli (Îlots, Ruelles en U, École Bousherit, Mosquée, Front Commercial)',
  referencePlanUrl: '/assets/aistudio/image_9d4e1949.png',
  metersPerPixel: 0.76, // 662 × 651 px -> ~503m × 495m

  // ==========================================
  // 1. ÎLOTS URBAINS (Cadastre & Superblocks)
  // ==========================================
  blocks: [
    {
      id: 'ilot_base_vie_chinoise',
      code: 'ÎLOT-BVC',
      name: 'Îlot Base de Vie Chinoise (Chantier, Cour & Baraquements)',
      category: 'equipments',
      color: '#d97706',
      description: 'Enceinte de base de vie de chantier avec grande cour logistique dégagée et baraquements modulaires en pourtour selon plan original.',
      polygon: [
        { x: 228, y: 5 },
        { x: 384, y: 5 },
        { x: 384, y: 74 },
        { x: 228, y: 74 },
      ],
      labelPoint: { x: 306, y: 40 },
      buildingCount: 3,
    },
    {
      id: 'ilot_lotissement_ne',
      code: 'ÎLOT-LOT-NE',
      name: 'Îlot Lotissement Résidentiel Nord-Est (Parcelles Cadastrales Régulières)',
      category: 'subdivision',
      color: '#475569',
      description: 'Trame parcellaire dense et régulière en deux bandes parallèles de parcelles résidentielles individuelles hachurées.',
      polygon: [
        { x: 390, y: 5 },
        { x: 494, y: 5 },
        { x: 494, y: 110 },
        { x: 390, y: 110 },
      ],
      labelPoint: { x: 442, y: 55 },
      buildingCount: 12,
    },
    {
      id: 'ilot_courbe_nord',
      code: 'ÎLOT-2',
      name: 'Îlot 2 — Ensemble Résidentiel Courbe Nord',
      category: 'residential',
      color: '#1e3a8a',
      description: 'Super-îlot semi-ouvert constitué d’une double barre courbe d’habitat collectif entourant une cour arborée.',
      polygon: [
        { x: 228, y: 74 },
        { x: 355, y: 86 },
        { x: 372, y: 146 },
        { x: 348, y: 160 },
        { x: 232, y: 136 },
        { x: 222, y: 92 },
      ],
      labelPoint: { x: 295, y: 120 },
      buildingCount: 5,
    },
    {
      id: 'ilot_coeur_central',
      code: 'ÎLOT-3',
      name: 'Îlot 3 — Cœur d’Îlot Résidentiel & Front Commercial',
      category: 'commercial',
      color: '#b45309',
      description: 'Cœur dense de l’UV9 traversé par le réseau de ruelles piétonnes en U, bordé à l’est par le Front Commercial continu.',
      polygon: [
        { x: 224, y: 142 },
        { x: 356, y: 154 },
        { x: 356, y: 318 },
        { x: 334, y: 326 },
        { x: 260, y: 324 },
        { x: 224, y: 305 },
      ],
      labelPoint: { x: 285, y: 225 },
      buildingCount: 16,
    },
    {
      id: 'ilot_ecole_ouest',
      code: 'ÎLOT-4',
      name: 'Îlot 4 — Complexe Scolaire Bousherit & Barres Dentelées',
      category: 'school',
      color: '#047857',
      description: 'Complexe scolaire École Bousherit Belehreche C.J.E, ses cours intérieures et les barres d’habitat social en peigne (M M M).',
      polygon: [
        { x: 82, y: 104 },
        { x: 216, y: 114 },
        { x: 216, y: 262 },
        { x: 82, y: 262 },
      ],
      labelPoint: { x: 140, y: 148 },
      buildingCount: 8,
    },
    {
      id: 'ilot_barres_sw',
      code: 'ÎLOT-5',
      name: 'Îlot 5 — Barres Inclinées Résidentielles Sud-Ouest',
      category: 'residential',
      color: '#4338ca',
      description: 'Alignement diagonal caractéristique des barres d’habitat collectif avec venelles piétonnes aérées orientées au vent.',
      polygon: [
        { x: 78, y: 265 },
        { x: 218, y: 265 },
        { x: 325, y: 388 },
        { x: 78, y: 388 },
      ],
      labelPoint: { x: 150, y: 335 },
      buildingCount: 8,
    },
    {
      id: 'ilot_equipements_est',
      code: 'ÎLOT-6',
      name: 'Îlot 6 — Pôle Hôtelier, Grande Mosquée & CEM Amar',
      category: 'equipments',
      color: '#701a75',
      description: 'Pôle structurant de centralité urbaine accueillant l’Hôtel et sa fontaine, la Grande Mosquée UV9 et le collège CEM Amar.',
      polygon: [
        { x: 366, y: 112 },
        { x: 490, y: 112 },
        { x: 490, y: 388 },
        { x: 366, y: 388 },
      ],
      labelPoint: { x: 420, y: 240 },
      buildingCount: 7,
    },
    {
      id: 'ilot_ouest_periph',
      code: 'ÎLOT-7',
      name: 'Îlot 7 — Façade Ouest Périphérique',
      category: 'residential',
      color: '#334155',
      description: 'Bordure ouest le long de l’axe de liaison inter-quartiers reliant UV9 vers UV10.',
      polygon: [
        { x: 5, y: 10 },
        { x: 76, y: 10 },
        { x: 76, y: 390 },
        { x: 5, y: 390 },
      ],
      labelPoint: { x: 40, y: 200 },
      buildingCount: 6,
    },
  ],

  // ==========================================
  // 2. RUELLES & VENELLES PIÉTONNES (Corridors piétons)
  // ==========================================
  ruelles: [
    {
      id: 'ruelle_u_ouest',
      code: 'R1-O',
      name: 'Ruelle Cœur Central — Branche Ouest Arborée',
      type: 'ruelle_principale',
      path: [
        { x: 236, y: 144 },
        { x: 236, y: 188 },
        { x: 236, y: 230 },
        { x: 238, y: 270 },
        { x: 244, y: 298 },
      ],
      width: 6.5,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.8,
      description: 'Voie piétonne paysagère ombragée principale descendant le cœur d’îlot entre les plots d’habitat.',
    },
    {
      id: 'ruelle_u_nord',
      code: 'R1-N',
      name: 'Ruelle Cœur Central — Traverse Haute Nord',
      type: 'passage_traverse',
      path: [
        { x: 236, y: 144 },
        { x: 266, y: 144 },
        { x: 292, y: 144 },
      ],
      width: 5.5,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.2,
      description: 'Liaison piétonne transversale haute fermant la boucle en U du cœur résidentiel.',
    },
    {
      id: 'ruelle_u_est',
      code: 'R1-E',
      name: 'Ruelle Cœur Central — Branche Est Inter-Plots',
      type: 'ruelle_principale',
      path: [
        { x: 292, y: 144 },
        { x: 292, y: 188 },
        { x: 292, y: 232 },
        { x: 290, y: 272 },
        { x: 284, y: 300 },
      ],
      width: 6.5,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.9,
      description: 'Ruelle arborée très animée entre les résidences intérieures et l’arrière du front commercial.',
    },
    {
      id: 'ruelle_u_sud',
      code: 'R1-S',
      name: 'Ruelle Cœur Central — Boucle Sud & Sortie',
      type: 'ruelle_principale',
      path: [
        { x: 244, y: 298 },
        { x: 264, y: 312 },
        { x: 284, y: 300 },
      ],
      width: 6.0,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.4,
      description: 'Arc piétonnier sud rejoignant le carrefour piétonnier et le marché informel.',
    },
    {
      id: 'ruelle_front_commercial',
      code: 'R-COMM',
      name: 'Promenade du Front Commercial & Boutiques',
      type: 'promenade_arberee',
      path: [
        { x: 320, y: 165 },
        { x: 320, y: 200 },
        { x: 320, y: 240 },
        { x: 320, y: 280 },
        { x: 316, y: 315 },
      ],
      width: 7.5,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 2.6,
      description: 'Promenade piétonne bordée d’arbres et de terrasses devant la galerie commerçante du boulevard.',
    },
    {
      id: 'venelle_traverse_1',
      code: 'V-TR1',
      name: 'Venelle Transversale Nord (École → Cœur → Boulevard)',
      type: 'venelle',
      path: [
        { x: 195, y: 172 },
        { x: 236, y: 172 },
        { x: 266, y: 172 },
        { x: 292, y: 172 },
        { x: 320, y: 172 },
        { x: 356, y: 172 },
      ],
      width: 4.5,
      isPedestrianOnly: true,
      hasTrees: false,
      flowFactor: 1.5,
      description: 'Venelle piétonne transversale reliant directement l’École Bousherit au boulevard commercial.',
    },
    {
      id: 'venelle_traverse_2',
      code: 'V-TR2',
      name: 'Venelle Transversale Centrale (Axe Marché Informel)',
      type: 'venelle',
      path: [
        { x: 195, y: 215 },
        { x: 236, y: 215 },
        { x: 266, y: 215 },
        { x: 292, y: 215 },
        { x: 320, y: 215 },
        { x: 356, y: 215 },
      ],
      width: 5.0,
      isPedestrianOnly: true,
      hasTrees: false,
      flowFactor: 2.3,
      description: 'Passage piéton très fréquenté menant aux étals du marché informel et aux commerces de proximité.',
    },
    {
      id: 'venelle_traverse_3',
      code: 'V-TR3',
      name: 'Venelle Transversale Sud (Liaison Résidentielle)',
      type: 'venelle',
      path: [
        { x: 195, y: 255 },
        { x: 236, y: 255 },
        { x: 266, y: 255 },
        { x: 292, y: 255 },
        { x: 320, y: 255 },
        { x: 356, y: 255 },
      ],
      width: 4.5,
      isPedestrianOnly: true,
      hasTrees: false,
      flowFactor: 1.3,
      description: 'Passage piétonnier desservant les cours intérieures sud de l’habitat collectif.',
    },
    {
      id: 'ruelle_courbe_nord_interieure',
      code: 'R-CRB',
      name: 'Allée Arborée Intérieure — Îlot Courbe Nord',
      type: 'promenade_arberee',
      path: [
        { x: 242, y: 98 },
        { x: 285, y: 104 },
        { x: 326, y: 116 },
        { x: 350, y: 130 },
      ],
      width: 5.5,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.1,
      description: 'Cour intérieure paysagère entre la barre courbe nord extérieure et la barre intérieure.',
    },
    {
      id: 'venelle_ecole_parvis',
      code: 'V-ECL',
      name: 'Parvis & Venelle d’Accès École Bousherit',
      type: 'venelle',
      path: [
        { x: 88, y: 154 },
        { x: 132, y: 154 },
        { x: 175, y: 154 },
      ],
      width: 5.0,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.7,
      description: 'Allée d’accès sécurisée pour élèves et familles devant les cours de récréation.',
    },
    {
      id: 'venelle_dentelee_1',
      code: 'V-DNT1',
      name: 'Venelle des Barres Dentelées M1 / M2',
      type: 'venelle',
      path: [
        { x: 92, y: 206 },
        { x: 172, y: 206 },
      ],
      width: 4.2,
      isPedestrianOnly: true,
      hasTrees: false,
      flowFactor: 1.2,
      description: 'Passage piétonnier intime entre les redents de balcons M M M de l’habitat social.',
    },
    {
      id: 'venelle_dentelee_2',
      code: 'V-DNT2',
      name: 'Venelle des Barres Dentelées M2 / M3',
      type: 'venelle',
      path: [
        { x: 92, y: 230 },
        { x: 172, y: 230 },
      ],
      width: 4.2,
      isPedestrianOnly: true,
      hasTrees: false,
      flowFactor: 1.2,
      description: 'Passage piétonnier intérieur sous les loggias de la barre M3.',
    },
    {
      id: 'allee_inter_sw_1',
      code: 'A-SW1',
      name: 'Allée Piétonne Inclinée S1 / S2',
      type: 'venelle',
      path: [
        { x: 98, y: 284 },
        { x: 150, y: 270 },
        { x: 205, y: 256 },
      ],
      width: 4.8,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.1,
      description: 'Interstice paysager diagonal orienté selon les vents dominants sud-ouest.',
    },
    {
      id: 'allee_inter_sw_2',
      code: 'A-SW2',
      name: 'Allée Piétonne Inclinée S2 / S3',
      type: 'venelle',
      path: [
        { x: 98, y: 316 },
        { x: 150, y: 302 },
        { x: 205, y: 288 },
      ],
      width: 4.8,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.1,
      description: 'Interstice piétonnier arboré garantissant l’aération naturelle entre les barres.',
    },
    {
      id: 'allee_inter_sw_3',
      code: 'A-SW3',
      name: 'Allée Piétonne Inclinée S3 / S4',
      type: 'venelle',
      path: [
        { x: 98, y: 348 },
        { x: 150, y: 334 },
        { x: 205, y: 320 },
      ],
      width: 4.8,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 1.1,
      description: 'Couloir piétonnier sud reliant l’avenue ouest au boulevard sud.',
    },
    {
      id: 'promenade_mosquee_hotel',
      code: 'P-MSQ',
      name: 'Esplanade Piétonne Paysagère Mosquée — Fontaine Hôtel',
      type: 'promenade_arberee',
      path: [
        { x: 375, y: 150 },
        { x: 375, y: 190 },
        { x: 375, y: 235 },
        { x: 375, y: 280 },
      ],
      width: 8.0,
      isPedestrianOnly: true,
      hasTrees: true,
      flowFactor: 2.1,
      description: 'Grande promenade arborée reliant le parvis de l’Hôtel, son bassin et le minaret de la Mosquée.',
    },
  ],

  // ==========================================
  // 3. BÂTIMENTS & ARCHITECTURE (Footprints 2D/3D)
  // ==========================================
  buildings: [
    // --- BASE DE VIE CHINOISE (Partie supérieure centrale - Plan Original) ---
    {
      id: 'bld_bvc_barracks',
      name: 'Base de Vie Chinoise (Baraquements Modulaires Nord)',
      x: 272,
      y: 12,
      width: 70,
      height: 14,
      floors: 2,
      rotation: 0,
    },
    {
      id: 'bld_bvc_admin',
      name: 'Base de Vie Chinoise (Bureaux & Direction Chantier)',
      x: 238,
      y: 20,
      width: 26,
      height: 24,
      floors: 2,
      rotation: 0,
    },
    {
      id: 'bld_bvc_hangar',
      name: 'Base de Vie Chinoise (Hangars & Stockage Logistique)',
      x: 348,
      y: 22,
      width: 26,
      height: 38,
      floors: 1,
      rotation: 0,
    },

    // --- ÉQUIPEMENTS MAJEURS DU SITE ---
    {
      id: 'bld_ecole_main',
      name: 'École Bousherit Belehreche C.J.E (Aile Principale)',
      x: 88,
      y: 124,
      width: 48,
      height: 28,
      floors: 3,
      rotation: 0,
    },
    {
      id: 'bld_ecole_wing',
      name: 'École Bousherit Belehreche C.J.E (Aile Classes & Cour)',
      x: 134,
      y: 130,
      width: 32,
      height: 44,
      floors: 3,
      rotation: 0,
    },
    {
      id: 'bld_hotel',
      name: 'Hôtel & Cour d’Honneur (Bassin / Fontaine)',
      x: 378,
      y: 126,
      width: 56,
      height: 48,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_mosque',
      name: 'Grande Mosquée UV9 (Salle de Prière, Minaret & Dôme)',
      x: 378,
      y: 222,
      width: 46,
      height: 38,
      floors: 4,
      rotation: 0,
    },
    {
      id: 'bld_cem',
      name: 'CEM Amar (Collège d’Enseignement Moyen)',
      x: 432,
      y: 226,
      width: 42,
      height: 56,
      floors: 3,
      rotation: 0,
    },

    // --- ÎLOT COURBE NORD (Double barre courbe selon plan de site) ---
    {
      id: 'bld_nord_curve1',
      name: 'Îlot Courbe Nord — Aile Ouest Extérieure',
      x: 236,
      y: 84,
      width: 52,
      height: 24,
      floors: 6,
      rotation: 10,
    },
    {
      id: 'bld_nord_curve2',
      name: 'Îlot Courbe Nord — Aile Centrale Extérieure',
      x: 284,
      y: 92,
      width: 66,
      height: 22,
      floors: 6,
      rotation: 16,
    },
    {
      id: 'bld_nord_curve3',
      name: 'Îlot Courbe Nord — Angle Est Extérieur',
      x: 344,
      y: 110,
      width: 26,
      height: 34,
      floors: 6,
      rotation: 38,
    },
    {
      id: 'bld_nord_curve_inner1',
      name: 'Îlot Courbe Nord — Barre Intérieure Ouest',
      x: 246,
      y: 112,
      width: 54,
      height: 18,
      floors: 5,
      rotation: 8,
    },
    {
      id: 'bld_nord_curve_inner2',
      name: 'Îlot Courbe Nord — Barre Intérieure Est',
      x: 298,
      y: 122,
      width: 50,
      height: 18,
      floors: 5,
      rotation: 15,
    },

    // Barres Nord A1, A2, A3 au-dessus de l'école
    {
      id: 'bld_nord_bar1',
      name: 'Barre Résidentielle Nord A1',
      x: 105,
      y: 35,
      width: 72,
      height: 24,
      floors: 5,
      rotation: -14,
    },
    {
      id: 'bld_nord_bar2',
      name: 'Barre Résidentielle Nord A2',
      x: 172,
      y: 54,
      width: 64,
      height: 24,
      floors: 5,
      rotation: -14,
    },
    {
      id: 'bld_nord_bar3',
      name: 'Barre Résidentielle Nord A3',
      x: 164,
      y: 96,
      width: 56,
      height: 22,
      floors: 5,
      rotation: -14,
    },

    // --- FRONT COMMERCIAL CENTRAL (5 blocs continus avec arcades) ---
    {
      id: 'bld_comm_front1',
      name: 'Front Commercial Central 1 (Boutiques & Arcades)',
      x: 330,
      y: 178,
      width: 26,
      height: 26,
      floors: 6,
      rotation: 0,
    },
    {
      id: 'bld_comm_front2',
      name: 'Front Commercial Central 2 (Galerie Marchande)',
      x: 330,
      y: 206,
      width: 26,
      height: 26,
      floors: 6,
      rotation: 0,
    },
    {
      id: 'bld_comm_front3',
      name: 'Front Commercial Central 3 (Commerces & Cafés)',
      x: 330,
      y: 234,
      width: 26,
      height: 26,
      floors: 6,
      rotation: 0,
    },
    {
      id: 'bld_comm_front4',
      name: 'Front Commercial Central 4 (Services Urbains)',
      x: 330,
      y: 262,
      width: 26,
      height: 26,
      floors: 6,
      rotation: 0,
    },
    {
      id: 'bld_comm_front5',
      name: 'Front Commercial Central 5 (Pharmacie & Alimentation)',
      x: 326,
      y: 290,
      width: 26,
      height: 28,
      floors: 6,
      rotation: 0,
    },

    // --- NOYAU CENTRAL DENSE (Logements imbriqués le long des ruelles) ---
    {
      id: 'bld_core_west1',
      name: 'Bloc Résidentiel Cœur d’Îlot Ouest 1',
      x: 242,
      y: 154,
      width: 20,
      height: 28,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_west2',
      name: 'Bloc Résidentiel Cœur d’Îlot Ouest 2',
      x: 242,
      y: 192,
      width: 20,
      height: 30,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_west3',
      name: 'Bloc Résidentiel Cœur d’Îlot Ouest 3',
      x: 240,
      y: 232,
      width: 22,
      height: 30,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_west4',
      name: 'Bloc Résidentiel Cœur d’Îlot Ouest 4 (Courbe Sud)',
      x: 242,
      y: 272,
      width: 24,
      height: 26,
      floors: 5,
      rotation: 12,
    },
    {
      id: 'bld_core_mid1',
      name: 'Plot Résidentiel Médian M1',
      x: 268,
      y: 156,
      width: 18,
      height: 24,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_mid2',
      name: 'Plot Résidentiel Médian M2',
      x: 268,
      y: 190,
      width: 18,
      height: 24,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_mid3',
      name: 'Plot Résidentiel Médian M3',
      x: 268,
      y: 224,
      width: 18,
      height: 24,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_east1',
      name: 'Barre Résidentielle Intérieure E1',
      x: 298,
      y: 154,
      width: 20,
      height: 28,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_east2',
      name: 'Barre Résidentielle Intérieure E2',
      x: 298,
      y: 192,
      width: 20,
      height: 32,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_east3',
      name: 'Barre Résidentielle Intérieure E3',
      x: 298,
      y: 234,
      width: 20,
      height: 32,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_core_east4',
      name: 'Barre Résidentielle Intérieure E4',
      x: 296,
      y: 274,
      width: 20,
      height: 28,
      floors: 5,
      rotation: 0,
    },

    // --- BARRES DENTELÉES "M M M" SOUS L’ÉCOLE BOUSHERIT ---
    {
      id: 'bld_west_mid1',
      name: 'Barre Dentelée M1 (Sous l’École - Balcons M M M)',
      x: 96,
      y: 184,
      width: 74,
      height: 20,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_west_mid2',
      name: 'Barre Dentelée M2 (Sous l’École - Redents M M M)',
      x: 122,
      y: 214,
      width: 56,
      height: 20,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_west_mid3',
      name: 'Barre Dentelée M3 (Habitat Social Intermédiaire)',
      x: 96,
      y: 236,
      width: 74,
      height: 20,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_west_inter1',
      name: 'Plot d’Angle Ouest P1',
      x: 186,
      y: 154,
      width: 22,
      height: 28,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_west_inter2',
      name: 'Plot d’Angle Ouest P2',
      x: 188,
      y: 194,
      width: 22,
      height: 32,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_west_inter3',
      name: 'Plot d’Angle Ouest P3',
      x: 184,
      y: 238,
      width: 22,
      height: 28,
      floors: 5,
      rotation: 0,
    },

    // --- BARRES INCLINÉES SUD-OUEST (Trame typique Ali Mendjeli) ---
    {
      id: 'bld_sw_diag1',
      name: 'Barre Inclinée Sud-Ouest S1',
      x: 96,
      y: 266,
      width: 108,
      height: 20,
      floors: 5,
      rotation: -15,
    },
    {
      id: 'bld_sw_diag2',
      name: 'Barre Inclinée Sud-Ouest S2',
      x: 102,
      y: 298,
      width: 108,
      height: 20,
      floors: 5,
      rotation: -15,
    },
    {
      id: 'bld_sw_diag3',
      name: 'Barre Inclinée Sud-Ouest S3',
      x: 92,
      y: 330,
      width: 112,
      height: 20,
      floors: 5,
      rotation: -15,
    },
    {
      id: 'bld_sw_diag4',
      name: 'Barre Inclinée Sud-Ouest S4',
      x: 98,
      y: 364,
      width: 112,
      height: 20,
      floors: 5,
      rotation: -15,
    },

    // --- BARRES SUD-CENTRALES INCLINÉES ---
    {
      id: 'bld_sc_diag1',
      name: 'Barre Sud-Centrale SC1',
      x: 218,
      y: 310,
      width: 88,
      height: 19,
      floors: 5,
      rotation: -15,
    },
    {
      id: 'bld_sc_diag2',
      name: 'Barre Sud-Centrale SC2',
      x: 228,
      y: 340,
      width: 88,
      height: 19,
      floors: 5,
      rotation: -15,
    },
    {
      id: 'bld_sc_diag3',
      name: 'Barre Sud-Centrale SC3',
      x: 242,
      y: 370,
      width: 84,
      height: 19,
      floors: 5,
      rotation: -15,
    },

    // --- HABITAT EST (Axe Avenue Est & Mosquée) ---
    {
      id: 'bld_east_res1',
      name: 'Barre Résidentielle Est B1',
      x: 378,
      y: 274,
      width: 26,
      height: 38,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_east_res2',
      name: 'Barre Résidentielle Est B2',
      x: 378,
      y: 320,
      width: 26,
      height: 38,
      floors: 5,
      rotation: 0,
    },
    {
      id: 'bld_east_res3',
      name: 'Plot Résidentiel Sud-Est B3',
      x: 422,
      y: 314,
      width: 36,
      height: 22,
      floors: 5,
      rotation: -18,
    },
    {
      id: 'bld_east_res4',
      name: 'Plot Résidentiel Sud-Est B4',
      x: 432,
      y: 344,
      width: 36,
      height: 22,
      floors: 5,
      rotation: -18,
    },

    // --- LOTISSEMENT NORD-EST (12 Parcelles régulières hachurées du plan de site) ---
    // Rangée 1
    { id: 'bld_lot_1', name: 'Lotissement N-E — Parcelle #1 (Cadastre)', x: 396, y: 12, width: 38, height: 14, floors: 2, rotation: 0 },
    { id: 'bld_lot_2', name: 'Lotissement N-E — Parcelle #2 (Cadastre)', x: 440, y: 12, width: 44, height: 14, floors: 2, rotation: 0 },
    // Rangée 2
    { id: 'bld_lot_3', name: 'Lotissement N-E — Parcelle #3 (Cadastre)', x: 396, y: 28, width: 38, height: 14, floors: 2, rotation: 0 },
    { id: 'bld_lot_4', name: 'Lotissement N-E — Parcelle #4 (Cadastre)', x: 440, y: 28, width: 44, height: 14, floors: 2, rotation: 0 },
    // Rangée 3
    { id: 'bld_lot_5', name: 'Lotissement N-E — Parcelle #5 (Cadastre)', x: 396, y: 44, width: 38, height: 14, floors: 2, rotation: 0 },
    { id: 'bld_lot_6', name: 'Lotissement N-E — Parcelle #6 (Cadastre)', x: 440, y: 44, width: 44, height: 14, floors: 2, rotation: 0 },
    // Rangée 4
    { id: 'bld_lot_7', name: 'Lotissement N-E — Parcelle #7 (Cadastre)', x: 396, y: 60, width: 38, height: 14, floors: 2, rotation: 0 },
    { id: 'bld_lot_8', name: 'Lotissement N-E — Parcelle #8 (Cadastre)', x: 440, y: 60, width: 44, height: 14, floors: 2, rotation: 0 },
    // Rangée 5
    { id: 'bld_lot_9', name: 'Lotissement N-E — Parcelle #9 (Cadastre)', x: 396, y: 76, width: 38, height: 14, floors: 2, rotation: 0 },
    { id: 'bld_lot_10', name: 'Lotissement N-E — Parcelle #10 (Cadastre)', x: 440, y: 76, width: 44, height: 14, floors: 2, rotation: 0 },
    // Rangée 6
    { id: 'bld_lot_11', name: 'Lotissement N-E — Parcelle #11 (Cadastre)', x: 396, y: 92, width: 38, height: 14, floors: 2, rotation: 0 },
    { id: 'bld_lot_12', name: 'Lotissement N-E — Parcelle #12 (Cadastre)', x: 440, y: 92, width: 44, height: 14, floors: 2, rotation: 0 },
  ],

  // ==========================================
  // 4. BOULEVARDS & VOIES CARROSSABLES (Streets)
  // ==========================================
  streets: [
    {
      id: 'st_A',
      name: 'Rue A — Boulevard Commercial & Axe Mosquée-Hôtel',
      code: 'RueA',
      description: 'Axe central piétonnier majeur très fréquenté longeant le Front Commercial, reliant l’Hôtel, la Mosquée et le Marché.',
      width: 24,
      defaultFlowPerHour: 450,
      path: [
        { x: 358, y: 0 },
        { x: 358, y: 120 },
        { x: 356, y: 200 },
        { x: 356, y: 280 },
        { x: 356, y: 400 },
      ],
    },
    {
      id: 'st_B',
      name: 'Rue B — Axe Transversal École Bousherit - Marché',
      code: 'RueB',
      description: 'Traversée transversale est-ouest desservant le complexe scolaire, traversant le noyau central jusqu’au boulevard.',
      width: 18,
      defaultFlowPerHour: 220,
      path: [
        { x: 0, y: 172 },
        { x: 80, y: 172 },
        { x: 180, y: 172 },
        { x: 260, y: 172 },
        { x: 356, y: 172 },
        { x: 500, y: 172 },
      ],
    },
    {
      id: 'st_C',
      name: 'Rue C — Voie de Liaison Ouest & Desserte Nord',
      code: 'RueC',
      description: 'Voie de distribution ouest bordant l’École Bousherit et reliant les ruelles piétonnes intérieures.',
      width: 14,
      defaultFlowPerHour: 140,
      path: [
        { x: 215, y: 0 },
        { x: 222, y: 110 },
        { x: 222, y: 190 },
        { x: 222, y: 280 },
        { x: 215, y: 400 },
      ],
    },
    {
      id: 'st_D',
      name: 'Rue D — Axe Sud & Desserte des Barres Inclinées',
      code: 'RueD',
      description: 'Boulevard sud longeant les barres inclinées et reliant les accès transports en commun (Tramway / Taxis).',
      width: 22,
      defaultFlowPerHour: 280,
      path: [
        { x: 0, y: 385 },
        { x: 140, y: 385 },
        { x: 235, y: 385 },
        { x: 356, y: 385 },
        { x: 500, y: 385 },
      ],
    },
  ],

  // ==========================================
  // 5. ESPACES VERTS & CANOPÉES (Vegetation)
  // ==========================================
  vegetationZones: [
    // 1. Grand Espace Vert / Parc Métropolitain Nord (au-dessus du boulevard nord)
    {
      id: 'veg_grand_parc_nord',
      name: 'Grand Parc Métropolitain Nord (Hauteurs UV9)',
      x: 235,
      y: 12,
      width: 135,
      height: 58,
      density: 0.85,
      canopyCoverPercent: 75,
      treeCount: 42,
      addedInScenario: ['S0', 'S1', 'S2', 'S3', 'S4'],
    },
    // 2. Canopée arborée Cœur d’Îlot Central (Ruelles en U)
    {
      id: 'veg_core_courtyard',
      name: 'Canopée & Ruelles Cœur d’Îlot Central',
      x: 224,
      y: 142,
      width: 110,
      height: 168,
      density: 0.65,
      canopyCoverPercent: 55,
      treeCount: 46,
      addedInScenario: ['S0', 'S1', 'S2', 'S3', 'S4'],
    },
    // 3. Esplanade Paysagère de la Mosquée & Hôtel
    {
      id: 'veg_mosque_esplanade',
      name: 'Esplanade Paysagère de la Grande Mosquée & Hôtel',
      x: 370,
      y: 140,
      width: 60,
      height: 130,
      density: 0.7,
      canopyCoverPercent: 55,
      treeCount: 28,
      addedInScenario: ['S0', 'S1', 'S2', 'S3', 'S4'],
    },
    // 4. Alignement Arboré Boulevard Commercial Central (Rue A)
    {
      id: 'veg_boulevard_trees',
      name: 'Alignement d’Ombrage — Promenade Commerciale',
      x: 346,
      y: 124,
      width: 18,
      height: 250,
      density: 0.75,
      canopyCoverPercent: 60,
      treeCount: 36,
      addedInScenario: ['S0', 'S1', 'S2', 'S3', 'S4'],
    },
    // 5. Tampon Boisé Sud-Ouest
    {
      id: 'veg_sw_buffer',
      name: 'Alignement Végétal Sud — Protection Vent & Poussières',
      x: 212,
      y: 295,
      width: 48,
      height: 38,
      density: 0.6,
      canopyCoverPercent: 45,
      treeCount: 18,
      addedInScenario: ['S0', 'S1', 'S2', 'S3', 'S4'],
    },
    // Végétation additionnelle spécifique aux scénarios S1 et S4
    {
      id: 'veg_corridor_renforce',
      name: 'Corridor d’Aération Végétalisé Renforcé S1/S4',
      x: 340,
      y: 20,
      width: 32,
      height: 360,
      density: 0.9,
      canopyCoverPercent: 80,
      treeCount: 52,
      addedInScenario: ['S1', 'S4'],
    },
  ],

  // ==========================================
  // 6. MARCHÉ INFORMEL (Zone d’attraction)
  // ==========================================
  market: {
    id: 'mkt_informel',
    name: 'Marché Informel (Étals de fruits, légumes & vendeurs ambulants)',
    x: 285, // rue piétonne centrale du modèle (repère simulation)
    y: 230,
    width: 40,
    height: 30,
    stallCount: 36,
    attractionFactor: 2.4, // Fort pôle d’attraction et ralentissement piétonnier
  },

  // ==========================================
  // 7. PORTES D’ENTRÉE VISITEURS (Gates)
  // ==========================================
  visitorGates: [
    { id: 'gate_north', name: 'Porte Nord (Station Tramway / Entrée Nord)', position: { x: 300, y: 8 }, targetStreet: 'RueA', weight: 0.38 },
    { id: 'gate_south', name: 'Porte Sud (Rocade Sud / Marché)', position: { x: 395, y: 518 }, targetStreet: 'RueA', weight: 0.32 },
    { id: 'gate_west', name: 'Accès Ouest (École / UV10)', position: { x: 8, y: 280 }, targetStreet: 'RueB', weight: 0.15 },
    { id: 'gate_east', name: 'Accès Est (Axe Clinique / UV8)', position: { x: 512, y: 150 }, targetStreet: 'RueB', weight: 0.15 },
  ],

  // ==========================================
  // 8. MOBILIER URBAIN & REPERES (Landmarks)
  // ==========================================
  urbanFurniture: [
    { id: 'fountain_hotel', name: 'Bassin d’Eau / Fontaine Cour d’Hôtel', category: 'bench', x: 405, y: 150, width: 8, height: 8 },
    { id: 'minaret_mosque', name: 'Minaret Historique Mosquée UV9', category: 'lamp', x: 382, y: 224, width: 5, height: 5 },
    { id: 'lamp_1', name: 'Lampadaire Solaire Boulevard Commercial', category: 'lamp', x: 348, y: 140, width: 3, height: 3 },
    { id: 'lamp_2', name: 'Lampadaire Solaire Boulevard Commercial', category: 'lamp', x: 348, y: 220, width: 3, height: 3 },
    { id: 'lamp_3', name: 'Lampadaire Solaire Boulevard Commercial', category: 'lamp', x: 348, y: 310, width: 3, height: 3 },
    { id: 'bench_1', name: 'Banc Public Esplanade Mosquée', category: 'bench', x: 374, y: 245, width: 6, height: 3 },
    { id: 'bench_2', name: 'Banc Public Place du Marché', category: 'bench', x: 272, y: 218, width: 6, height: 3 },
    { id: 'bus_stop_1', name: 'Station Bus & Taxis Sud (Rue D)', category: 'bus_stop', x: 340, y: 380, width: 14, height: 6 },
    { id: 'kiosk_1', name: 'Kiosque à Journaux & Tabac Rue B', category: 'kiosk', x: 260, y: 168, width: 6, height: 6 },
  ],
};

/**
 * Relocated market coordinates used in S3 and S4:
 * Moved from congested Rue A corridor to an open ventilated esplanade on the southwest along Rue D.
 */
export const RELOCATED_MARKET_POSITION: Point = {
  x: 130, // esplanade engazonnée Sud-Ouest du modèle (repère simulation)
  y: 430,
};

/**
 * Check if a point (x, y) collides with any building footprint (plus buffer),
 * accounting for building rotation.
 */
export function isInsideBuilding(x: number, y: number, layout: SpatialLayout, buffer: number = 2.0): boolean {
  for (const b of layout.buildings) {
    let px = x;
    let py = y;
    if (b.rotation) {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const rad = (-b.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = x - cx;
      const dy = y - cy;
      px = cx + (dx * cos - dy * sin);
      py = cy + (dx * sin + dy * cos);
    }
    if (
      px >= b.x - buffer &&
      px <= b.x + b.width + buffer &&
      py >= b.y - buffer &&
      py <= b.y + b.height + buffer
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a point is inside a polygon (Ray Casting algorithm)
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns whether a point is inside a vegetation zone active for current scenario
 */
export function isInsideVegetation(x: number, y: number, layout: SpatialLayout, scenarioId: string): boolean {
  for (const v of layout.vegetationZones) {
    if (v.addedInScenario && !v.addedInScenario.includes(scenarioId as any)) {
      continue;
    }
    if (x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height) {
      return true;
    }
  }
  return false;
}

/**
 * Clamp point within terrain boundaries
 */
export function clampToTerrain(point: Point, layout: SpatialLayout): Point {
  return {
    x: Math.max(5, Math.min(layout.width - 5, point.x)),
    y: Math.max(5, Math.min(layout.height - 5, point.y)),
  };
}
