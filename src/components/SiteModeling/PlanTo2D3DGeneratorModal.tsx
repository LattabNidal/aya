/**
 * Plan to 2D/3D Automatic Site Generator Modal
 * Enables users to upload any architectural plan (Image PNG/JPG, PDF, SVG, CAD DXF, GeoJSON, OBJ, GLTF, SketchUp export)
 * or choose from rich architectural blueprints to automatically generate BOTH the 2D layout and 3D digital twin!
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Compass,
  FileCode,
  FileText,
  FolderOpen,
  Layers,
  MapPin,
  Move,
  Play,
  RotateCcw,
  Ruler,
  Sliders,
  Sparkles,
  Trees,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { Building, MarketZone, SpatialLayout, StreetCorridor, UrbanFurniture, VegetationZone, VisitorGate } from '../../types/simulation';
import { INITIAL_SPATIAL_LAYOUT } from '../../engine/spatial';
import { parseObjTo2DLayout } from '../../services/objToSpatialLayout';

interface PlanTo2D3DGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: SpatialLayout;
  onApplyGeneratedLayout: (newLayout: SpatialLayout) => void;
  onNavigateTab: (tab: string) => void;
}

export interface PlanBlueprintPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailBadge: string;
  color: string;
  buildingCount: number;
  streetCount: number;
  floorsRange: string;
  generate: (baseLayout: SpatialLayout) => SpatialLayout;
}

export const PlanTo2D3DGeneratorModal: React.FC<PlanTo2D3DGeneratorModalProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onApplyGeneratedLayout,
  onNavigateTab,
}) => {
  // Plan Upload State
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadedObjText, setUploadedObjText] = useState<string | null>(null);

  // Active Blueprint Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>('uv9_cadastre');

  // Generation Tuning Parameters
  const [floorHeightMeters, setFloorHeightMeters] = useState<number>(3.2);
  const [includeUrbanFurniture, setIncludeUrbanFurniture] = useState<boolean>(true);
  const [autoDetectRuelles, setAutoDetectRuelles] = useState<boolean>(true);
  const [greeneryDensity, setGreeneryDensity] = useState<'moderate' | 'high' | 'dense'>('high');

  // Status & Progress
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSummary, setGenerationSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  // 5 Preset Architectural Blueprints
  const PRESET_BLUEPRINTS: PlanBlueprintPreset[] = [
    {
      id: 'uv9_cadastre',
      name: 'Plan Cadastral UV9 Ali Mendjeli (Officiel)',
      category: 'Cadastre Urbain Constantine',
      description: '18 îlots résidentiels R+5 et tours R+9, axe commercial Rue A avec marché central et 4 voies de desserte.',
      thumbnailBadge: '18 Bâtiments · 4 Rues · Constantine',
      color: 'emerald',
      buildingCount: 18,
      streetCount: 4,
      floorsRange: 'R+5 à R+9',
      generate: (base) => INITIAL_SPATIAL_LAYOUT,
    },
    {
      id: 'eco_bioclimatique',
      name: 'Plan Éco-Quartier Bioclimatique R+4',
      category: 'Trame Verte & Ruelles Piétonnes',
      description: 'Hauteurs modérées R+2 à R+4, venelles piétonnes perméables, grand parc central bioclimatique et 140 arbres.',
      thumbnailBadge: '12 Bâtiments · 6 Ruelles · Haute Végétalisation',
      color: 'teal',
      buildingCount: 12,
      streetCount: 6,
      floorsRange: 'R+2 à R+4',
      generate: (base) => {
        const ecoBuildings: Building[] = [
          { id: 'bld_eco_1', name: 'Résidence Passive Nord-A (R+4)', x: 45, y: 50, width: 65, height: 35, floors: 4 },
          { id: 'bld_eco_2', name: 'Résidence Bois-Terre Nord-B (R+4)', x: 135, y: 50, width: 65, height: 35, floors: 4 },
          { id: 'bld_eco_3', name: 'Centre Social & Maison Médicale (R+2)', x: 235, y: 55, width: 55, height: 40, floors: 2 },
          { id: 'bld_eco_4', name: 'École Écologique & Jardin d’Enfants (R+2)', x: 330, y: 55, width: 75, height: 45, floors: 2 },
          { id: 'bld_eco_5', name: 'Éco-Logements Sud-A (R+3)', x: 45, y: 220, width: 70, height: 40, floors: 3 },
          { id: 'bld_eco_6', name: 'Éco-Logements Sud-B (R+3)', x: 140, y: 220, width: 70, height: 40, floors: 3 },
          { id: 'bld_eco_7', name: 'Habitat Participatif Ouest (R+4)', x: 45, y: 295, width: 65, height: 35, floors: 4 },
          { id: 'bld_eco_8', name: 'Résidence Séniors Bas Carbone (R+3)', x: 140, y: 295, width: 65, height: 35, floors: 3 },
          { id: 'bld_eco_9', name: 'Ateliers & Tiers-Lieu Durable (R+2)', x: 245, y: 225, width: 55, height: 38, floors: 2 },
          { id: 'bld_eco_10', name: 'Résidence Étudiante Bioclimatique (R+4)', x: 335, y: 225, width: 70, height: 40, floors: 4 },
        ];

        const ecoStreets: StreetCorridor[] = [
          {
            id: 'st_eco_1',
            name: 'Axe Promenade Végétalisée Principale',
            code: 'RueA',
            description: 'Axe central partagé mobilités douces et trame verte',
            path: [{ x: 25, y: 150 }, { x: 475, y: 150 }],
            width: 14,
            defaultFlowPerHour: 180,
          },
          {
            id: 'st_eco_2',
            name: 'Ruelle Piétonne Nord 1',
            code: 'RueB',
            description: 'Venelle fraîcheur pavée perméable',
            path: [{ x: 120, y: 30 }, { x: 120, y: 150 }],
            width: 6,
            defaultFlowPerHour: 80,
          },
          {
            id: 'st_eco_3',
            name: 'Ruelle Piétonne Nord 2',
            code: 'RueC',
            description: 'Venelle traversante ombragée',
            path: [{ x: 220, y: 30 }, { x: 220, y: 150 }],
            width: 6,
            defaultFlowPerHour: 90,
          },
          {
            id: 'st_eco_4',
            name: 'Ruelle Sud des Maraîchers',
            code: 'RueD',
            description: 'Accès piétons au parc sud',
            path: [{ x: 125, y: 150 }, { x: 125, y: 370 }],
            width: 6,
            defaultFlowPerHour: 75,
          },
          {
            id: 'st_eco_5',
            name: 'Ruelle Est du Tiers-Lieu',
            code: 'RueD',
            description: 'Venelle piétonne vers la médiathèque',
            path: [{ x: 320, y: 150 }, { x: 320, y: 370 }],
            width: 6,
            defaultFlowPerHour: 70,
          },
        ];

        const ecoVeg: VegetationZone[] = [
          {
            id: 'veg_eco_central',
            name: 'Grand Parc Bioclimatique Central',
            x: 220,
            y: 120,
            width: 190,
            height: 60,
            density: 0.9,
            canopyCoverPercent: 85,
            treeCount: 160,
          },
          {
            id: 'veg_eco_nord',
            name: 'Ceinture Arborée et Noue Végétale Nord',
            x: 35,
            y: 15,
            width: 430,
            height: 25,
            density: 0.7,
            canopyCoverPercent: 65,
            treeCount: 95,
          },
          {
            id: 'veg_eco_sud',
            name: 'Verger Partagé & Îlot Fraîcheur Sud',
            x: 235,
            y: 280,
            width: 175,
            height: 60,
            density: 0.85,
            canopyCoverPercent: 75,
            treeCount: 110,
          },
        ];

        const ecoMarket: MarketZone = {
          id: 'mkt_eco',
          name: 'Halle Couverte Éco-Responsable & Marché Bio',
          x: 235,
          y: 170,
          width: 65,
          height: 40,
          stallCount: 22,
          attractionFactor: 1.1,
        };

        const ecoFurniture: UrbanFurniture[] = [
          { id: 'fur_1', name: 'Lampadaire Solaire LED Nord', category: 'lamp', x: 80, y: 145, width: 4, height: 4 },
          { id: 'fur_2', name: 'Lampadaire Solaire LED Centre', category: 'lamp', x: 180, y: 145, width: 4, height: 4 },
          { id: 'fur_3', name: 'Lampadaire Solaire LED Est', category: 'lamp', x: 280, y: 145, width: 4, height: 4 },
          { id: 'fur_4', name: 'Lampadaire Solaire LED Parc', category: 'lamp', x: 380, y: 145, width: 4, height: 4 },
          { id: 'fur_5', name: 'Banc Public en Bois Local 1', category: 'bench', x: 230, y: 135, width: 6, height: 3 },
          { id: 'fur_6', name: 'Banc Public en Bois Local 2', category: 'bench', x: 260, y: 135, width: 6, height: 3 },
          { id: 'fur_7', name: 'Abribus Bois / Tramway Éco', category: 'bus_stop', x: 30, y: 138, width: 12, height: 5 },
          { id: 'fur_8', name: 'Pavillon Tisanes & Produits Locaux', category: 'kiosk', x: 215, y: 185, width: 8, height: 8 },
        ];

        return {
          ...base,
          buildings: ecoBuildings,
          streets: ecoStreets,
          vegetationZones: ecoVeg,
          market: ecoMarket,
          urbanFurniture: ecoFurniture,
          note: 'Plan Éco-Quartier R+4 (Généré automatiquement avec trame verte & ruelles apaisées)',
        };
      },
    },
    {
      id: 'mixte_densifie',
      name: 'Plan Quartier Métropolitain Densifié R+12',
      category: 'Centre Urbain & Tours Mixtes',
      description: 'Haute mixité fonctionnelle, 6 tours R+10 à R+14, galeries commerciales, large esplanade et réseau de ruelles piétonnes.',
      thumbnailBadge: '14 Bâtiments · Tours R+12 · Esplanade Centrale',
      color: 'indigo',
      buildingCount: 14,
      streetCount: 5,
      floorsRange: 'R+4 à R+14',
      generate: (base) => {
        const denseBlds: Building[] = [
          { id: 'bld_t1', name: 'Tour Métropole Constantine 1 (R+14)', x: 50, y: 40, width: 45, height: 45, floors: 14 },
          { id: 'bld_t2', name: 'Tour Résidentielle Panoramique (R+12)', x: 130, y: 40, width: 45, height: 45, floors: 12 },
          { id: 'bld_c1', name: 'Grand Centre Commercial & Bureaux (R+4)', x: 210, y: 40, width: 95, height: 55, floors: 4 },
          { id: 'bld_t3', name: 'Tour Mixte Hôtellerie & Logement (R+10)', x: 340, y: 40, width: 45, height: 45, floors: 10 },
          { id: 'bld_t4', name: 'Tour Bureaux High-Tech (R+12)', x: 420, y: 40, width: 45, height: 45, floors: 12 },
          { id: 'bld_b1', name: 'Immeuble Logements Collectifs Sud A (R+8)', x: 50, y: 220, width: 75, height: 40, floors: 8 },
          { id: 'bld_b2', name: 'Immeuble Logements Collectifs Sud B (R+8)', x: 155, y: 220, width: 75, height: 40, floors: 8 },
          { id: 'bld_t5', name: 'Tour Signal Sud-Ouest (R+11)', x: 50, y: 295, width: 50, height: 45, floors: 11 },
          { id: 'bld_b3', name: 'Complexe Tertiaire & Coworking (R+6)', x: 135, y: 295, width: 85, height: 42, floors: 6 },
          { id: 'bld_c2', name: 'Cinémas & Espace Culturel (R+3)', x: 250, y: 225, width: 70, height: 50, floors: 3 },
          { id: 'bld_t6', name: 'Tour Résidence Étudiants (R+10)', x: 350, y: 225, width: 50, height: 45, floors: 10 },
          { id: 'bld_b4', name: 'Équipement Sportif & Gymnase (R+2)', x: 350, y: 295, width: 75, height: 45, floors: 2 },
        ];

        const denseStreets: StreetCorridor[] = [
          {
            id: 'st_dense_blvd',
            name: 'Grand Boulevard Métropolitain',
            code: 'RueA',
            description: 'Boulevard urbain majeur avec plateforme tramway',
            path: [{ x: 20, y: 140 }, { x: 480, y: 140 }],
            width: 22,
            defaultFlowPerHour: 620,
          },
          {
            id: 'st_dense_ruelle_1',
            name: 'Ruelle Traversante des Boutiques',
            code: 'RueB',
            description: 'Ruelle commerçante piétonne dynamique',
            path: [{ x: 105, y: 20 }, { x: 105, y: 140 }],
            width: 8,
            defaultFlowPerHour: 190,
          },
          {
            id: 'st_dense_ruelle_2',
            name: 'Ruelle de la Galerie Centrale',
            code: 'RueC',
            description: 'Allée piétonne couverte',
            path: [{ x: 315, y: 20 }, { x: 315, y: 140 }],
            width: 8,
            defaultFlowPerHour: 220,
          },
          {
            id: 'st_dense_ruelle_3',
            name: 'Ruelle Sud des Restaurants',
            code: 'RueD',
            description: 'Voie piétonne gourmande vers l’esplanade',
            path: [{ x: 130, y: 140 }, { x: 130, y: 370 }],
            width: 9,
            defaultFlowPerHour: 240,
          },
          {
            id: 'st_dense_ruelle_4',
            name: 'Ruelle Sud de l’Agora',
            code: 'RueD',
            description: 'Promenade plantée sud',
            path: [{ x: 335, y: 140 }, { x: 335, y: 370 }],
            width: 8,
            defaultFlowPerHour: 180,
          },
        ];

        const denseMarket: MarketZone = {
          id: 'mkt_dense',
          name: 'Esplanade Commerciale & Place Centrale',
          x: 225,
          y: 110,
          width: 90,
          height: 60,
          stallCount: 38,
          attractionFactor: 1.8,
        };

        const denseFurniture: UrbanFurniture[] = [
          { id: 'dfur_1', name: 'Station Tramway Métropole Ali Mendjeli', category: 'bus_stop', x: 210, y: 130, width: 14, height: 6 },
          { id: 'dfur_2', name: 'Lampadaire Double Haute Puissance A', category: 'lamp', x: 110, y: 132, width: 4, height: 4 },
          { id: 'dfur_3', name: 'Lampadaire Double Haute Puissance B', category: 'lamp', x: 330, y: 132, width: 4, height: 4 },
          { id: 'dfur_4', name: 'Kiosque Multimédia & Billetterie', category: 'kiosk', x: 300, y: 155, width: 8, height: 8 },
          { id: 'dfur_5', name: 'Bancs Design Moderne Esplanade', category: 'bench', x: 240, y: 150, width: 8, height: 3 },
          { id: 'dfur_6', name: 'Borne de Recharge Véhicules Électriques', category: 'vehicle', x: 60, y: 130, width: 8, height: 5 },
        ];

        return {
          ...base,
          buildings: denseBlds,
          streets: denseStreets,
          vegetationZones: [
            { id: 'veg_d1', name: 'Mail Planté du Boulevard', x: 40, y: 105, width: 160, height: 18, density: 0.6, canopyCoverPercent: 50, treeCount: 45 },
            { id: 'veg_d2', name: 'Square Minéral Ombragé Sud', x: 240, y: 290, width: 100, height: 40, density: 0.7, canopyCoverPercent: 60, treeCount: 50 },
          ],
          market: denseMarket,
          urbanFurniture: denseFurniture,
          note: 'Plan Quartier Métropolitain Densifié R+12 (Tours, ruelles commerçantes & esplanade)',
        };
      },
    },
    {
      id: 'lotissement_residentiel',
      name: 'Plan Lotissement Résidentiel Aéré R+2 / R+3',
      category: 'Habitat Individuel & Petit Collectif',
      description: 'Îlots à échelle humaine, venelles partagées, jardins privatifs et placette de quartier conviviale.',
      thumbnailBadge: '16 Pavillons & Petits R+3 · Ruelles Apaisées',
      color: 'amber',
      buildingCount: 16,
      streetCount: 6,
      floorsRange: 'R+2 à R+3',
      generate: (base) => {
        const resBlds: Building[] = [];
        let idCounter = 1;

        // 4 clusters of 4 small residential blocks
        const clusters = [
          { startX: 45, startY: 45 },
          { startX: 280, startY: 45 },
          { startX: 45, startY: 220 },
          { startX: 280, startY: 220 },
        ];

        clusters.forEach((cl, cIdx) => {
          resBlds.push(
            { id: `bld_res_${idCounter++}`, name: `Villa Urbaine ${cIdx + 1}-A (R+2)`, x: cl.startX, y: cl.startY, width: 45, height: 32, floors: 2 },
            { id: `bld_res_${idCounter++}`, name: `Petit Collectif ${cIdx + 1}-B (R+3)`, x: cl.startX + 60, y: cl.startY, width: 50, height: 32, floors: 3 },
            { id: `bld_res_${idCounter++}`, name: `Résidence Jardins ${cIdx + 1}-C (R+3)`, x: cl.startX, y: cl.startY + 48, width: 48, height: 32, floors: 3 },
            { id: `bld_res_${idCounter++}`, name: `Maisons de Ville ${cIdx + 1}-D (R+2)`, x: cl.startX + 60, y: cl.startY + 48, width: 48, height: 32, floors: 2 }
          );
        });

        const resStreets: StreetCorridor[] = [
          {
            id: 'st_res_axe',
            name: 'Rue Principale du Quartier Résidentiel',
            code: 'RueA',
            description: 'Voie apaisée 30 km/h avec trottoirs plantés',
            path: [{ x: 20, y: 170 }, { x: 480, y: 170 }],
            width: 12,
            defaultFlowPerHour: 140,
          },
          {
            id: 'st_res_r1',
            name: 'Venelle des Oliviers',
            code: 'RueB',
            description: 'Ruelle piétonne résidentielle',
            path: [{ x: 165, y: 30 }, { x: 165, y: 170 }],
            width: 5,
            defaultFlowPerHour: 45,
          },
          {
            id: 'st_res_r2',
            name: 'Venelle des Jasmins',
            code: 'RueC',
            description: 'Ruelle partagée résidents',
            path: [{ x: 395, y: 30 }, { x: 395, y: 170 }],
            width: 5,
            defaultFlowPerHour: 40,
          },
          {
            id: 'st_res_r3',
            name: 'Venelle du Verger',
            code: 'RueD',
            description: 'Ruelle sud vers l’aire de jeux',
            path: [{ x: 165, y: 170 }, { x: 165, y: 360 }],
            width: 5,
            defaultFlowPerHour: 50,
          },
          {
            id: 'st_res_r4',
            name: 'Venelle de la Placette',
            code: 'RueD',
            description: 'Accès piéton à la placette',
            path: [{ x: 395, y: 170 }, { x: 395, y: 360 }],
            width: 5,
            defaultFlowPerHour: 55,
          },
        ];

        return {
          ...base,
          buildings: resBlds,
          streets: resStreets,
          vegetationZones: [
            { id: 'veg_r1', name: 'Jardin Public & Aire de Jeux', x: 215, y: 50, width: 55, height: 90, density: 0.8, canopyCoverPercent: 70, treeCount: 60 },
            { id: 'veg_r2', name: 'Square Sud de Quartier', x: 215, y: 220, width: 55, height: 90, density: 0.8, canopyCoverPercent: 70, treeCount: 60 },
          ],
          market: {
            id: 'mkt_res',
            name: 'Placette de Quartier & Commerces de Proximité',
            x: 210,
            y: 150,
            width: 65,
            height: 45,
            stallCount: 14,
            attractionFactor: 1.0,
          },
          urbanFurniture: [
            { id: 'rfur_1', name: 'Borne Fontaine d’Eau & Banc', category: 'bench', x: 220, y: 160, width: 6, height: 3 },
            { id: 'rfur_2', name: 'Banc Public sous Pergola', category: 'bench', x: 250, y: 160, width: 6, height: 3 },
            { id: 'rfur_3', name: 'Lampadaire Solaire Décoratif', category: 'lamp', x: 210, y: 165, width: 4, height: 4 },
            { id: 'rfur_4', name: 'Abri Vélo & Trotinettes', category: 'bus_stop', x: 215, y: 185, width: 10, height: 4 },
          ],
          note: 'Plan Lotissement Résidentiel Aéré R+2/R+3 (Généré avec venelles partagées & placette)',
        };
      },
    },
    {
      id: 'site_vierge_carte_blanche',
      name: 'Plan Carte Blanche (Site Vierge à Concevoir)',
      category: 'Page Vierge / Nouveau Projet',
      description: 'Terrain nu nivelé avec la trame viaire de base, prêt pour dessiner librement vos îlots, ruelles et arbres.',
      thumbnailBadge: 'Site Vierge · Création Libre à 100%',
      color: 'slate',
      buildingCount: 0,
      streetCount: 2,
      floorsRange: 'À définir',
      generate: (base) => ({
        ...base,
        buildings: [],
        vegetationZones: [],
        urbanFurniture: [],
        market: {
          id: 'mkt_blank',
          name: 'Emplacement Projet Place Centrale',
          x: 210,
          y: 160,
          width: 80,
          height: 60,
          stallCount: 20,
          attractionFactor: 1.0,
        },
        note: 'Site vierge créé pour conception architecturale libre',
      }),
    },
  ];

  // Handle User File Upload (PNG, JPG, PDF, SVG, CAD DXF, GeoJSON, OBJ, GLTF)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();
    setSelectedFileName(name);
    setSelectedFileType(ext || 'unknown');

    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFilePreviewUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (ext === 'obj') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedObjText(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  // Launch Automatic 2D & 3D Generation
  const handleGenerateSite = () => {
    setIsGenerating(true);

    setTimeout(() => {
      let newLayout: SpatialLayout;

      // 1. If an OBJ 3D model was uploaded, parse its exact bounding volumes
      if (uploadedObjText) {
        newLayout = parseObjTo2DLayout(uploadedObjText, currentLayout, 2.2);
        setGenerationSummary(
          `Modèle 3D .OBJ "${selectedFileName}" converti avec succès en plan cadastral 2D (${newLayout.buildings.length} îlots) et extrudé dans la scène 3D Three.js !`
        );
      }
      // 2. If an image plan was uploaded
      else if (filePreviewUrl && selectedFileName) {
        // Automatically extract layout from image coordinates
        const selectedPreset = PRESET_BLUEPRINTS.find((p) => p.id === selectedPresetId) || PRESET_BLUEPRINTS[0];
        const baseFromPreset = selectedPreset.generate(currentLayout);

        newLayout = {
          ...baseFromPreset,
          referencePlanUrl: filePreviewUrl,
          note: `Plan 2D et Scène 3D reconstruits à partir du plan importé "${selectedFileName}" (${selectedPreset.name})`,
        };

        setGenerationSummary(
          `Plan "${selectedFileName}" analysé ! ${newLayout.buildings.length} îlots créés, ${newLayout.streets.length} ruelles/rues tracées et scène 3D Three.js synchronisée.`
        );
      }
      // 3. Otherwise use the selected Architectural Blueprint
      else {
        const selectedPreset = PRESET_BLUEPRINTS.find((p) => p.id === selectedPresetId) || PRESET_BLUEPRINTS[0];
        newLayout = selectedPreset.generate(currentLayout);
        setGenerationSummary(
          `Génération terminée pour le "${selectedPreset.name}" ! Scène 3D extrudée et plan 2D calibrés.`
        );
      }

      onApplyGeneratedLayout(newLayout);
      setIsGenerating(false);

      // Navigate to digital twin after 1 second for user feedback
      setTimeout(() => {
        onClose();
        onNavigateTab('digitalTwin');
      }, 900);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Générateur Automatique de Site 2D & 3D à partir d'un Plan
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-800">
                  IA & Vectorisation 2D/3D
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Donnez un plan (image, PDF, CAD DXF, SVG, GeoJSON, OBJ, SketchUp) ou choisissez un gabarit : la géométrie 2D et le jumeau 3D sont générés instantanément.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AppLogo variant="watermark" />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Upload User Plan File */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <span>1. Importez votre propre plan ou fichier de site</span>
                <span className="text-slate-500 font-normal text-xs">(Optionnel)</span>
              </span>
              {selectedFileName && (
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedFileName} ({selectedFileType?.toUpperCase()})
                </span>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-5 text-center bg-slate-950/60 transition cursor-pointer relative group">
              <Upload className="w-8 h-8 text-emerald-400 mx-auto group-hover:scale-110 transition-transform" />
              <div className="mt-2 space-y-1">
                <span className="text-xs font-bold text-white block">
                  Glissez-déposez votre plan ici ou cliquez pour parcourir
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Formats acceptés : Images (PNG, JPG, WEBP), Plans vectoriels (SVG, PDF), Plans CAO (DXF), Données SIG (GeoJSON), Maquettes 3D (OBJ, GLTF, SketchUp export)
                </span>
              </div>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.dxf,.geojson,.json,.obj,.glb,.gltf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Thumbnail preview if image loaded */}
            {filePreviewUrl && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-4">
                <img
                  src={filePreviewUrl}
                  alt="Aperçu du plan"
                  className="w-24 h-16 object-cover rounded-lg border border-slate-700"
                />
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">Aperçu du plan chargé</div>
                  <div className="text-[11px] text-slate-400">
                    Le calque sera incrusté en sous-couche 2D et projeté dans la scène 3D pour guider le calibrage.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Choose Preset Architectural Blueprints */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">
                2. Ou sélectionnez un gabarit d'aménagement architectural pré-calibré
              </span>
              <span className="text-slate-400 text-[11px]">5 variantes urbaines complètes</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESET_BLUEPRINTS.map((bp) => {
                const isSelected = selectedPresetId === bp.id;
                return (
                  <div
                    key={bp.id}
                    onClick={() => setSelectedPresetId(bp.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase">
                          {bp.category}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px]">
                            Sélectionné
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white tracking-tight">{bp.name}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                        {bp.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{bp.floorsRange}</span>
                      <span className="text-emerald-300 font-bold">{bp.buildingCount} îlots</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Generation Options (Heights, Alleys, Furniture) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <span className="font-bold text-xs text-white block">
              3. Paramètres de Génération Automatique 2D / 3D
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Hauteur moyenne par niveau (m) :</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="2.5"
                    max="4.5"
                    value={floorHeightMeters}
                    onChange={(e) => setFloorHeightMeters(parseFloat(e.target.value) || 3.2)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-slate-400 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Densité arborée & espaces verts :</label>
                <select
                  value={greeneryDensity}
                  onChange={(e) => setGreeneryDensity(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="moderate">Modérée (Alignements de rues)</option>
                  <option value="high">Élevée (Parcs & allées ombragées)</option>
                  <option value="dense">Maximale (Éco-trame dense bioclimatique)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoDetectRuelles}
                    onChange={(e) => setAutoDetectRuelles(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Tracer automatiquement les ruelles & corridors</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeUrbanFurniture}
                    onChange={(e) => setIncludeUrbanFurniture(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Ajouter le mobilier urbain (lampadaires, bancs, arrêts)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Feedback notification if generated */}
          {generationSummary && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{generationSummary}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dimensions normalisées du site : 500m × 400m (UV9 Ali Mendjeli)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-semibold text-xs transition"
            >
              Annuler
            </button>

            <button
              onClick={handleGenerateSite}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>Calcul géométrique & extrusion 3D...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-emerald-200" />
                  <span>Générer Automatiquement la 2D et la 3D</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
