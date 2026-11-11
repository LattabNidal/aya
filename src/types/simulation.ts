/**
 * UrbanResilience SimLab - Types & Interfaces
 * Unité de Voisinage 9 (UV9), Ville Nouvelle Ali Mendjeli, Constantine, Algérie
 */

export type HealthState = 'S' | 'I' | 'R';
export type EpidemicModel = 'SI' | 'SIR';
export type ScenarioId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4';
export type InterpolationMethod = 'linear' | 'step';
export type SimulationMode = 'single' | 'sensitivity' | 'replications';

export interface Point {
  x: number;
  y: number;
}

export interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  rotation?: number; // rotation angle in degrees (0 - 360)
}

export interface StreetCorridor {
  id: string;
  name: string;
  code: 'RueA' | 'RueB' | 'RueC' | 'RueD';
  description: string;
  path: Point[];
  width: number;
  defaultFlowPerHour: number; // personnes / heure
  rotation?: number; // rotation in degrees
}

export interface VegetationZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  density: number; // 0 to 1
  canopyCoverPercent: number;
  treeCount: number;
  rotation?: number; // rotation in degrees
  addedInScenario?: ScenarioId[];
}

export interface MarketZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stallCount: number;
  attractionFactor: number;
  rotation?: number; // rotation in degrees
}

export interface VisitorGate {
  id: string;
  name: string;
  position: Point;
  targetStreet: 'RueA' | 'RueB' | 'RueC' | 'RueD';
  weight: number;
}

export interface UrbanFurniture {
  id: string;
  name: string;
  category: 'lamp' | 'bench' | 'tree' | 'bus_stop' | 'kiosk' | 'trash' | 'vehicle' | 'sketchfab';
  x: number;
  y: number;
  width: number;
  height: number;
  rotationY?: number;
  rotation?: number;
  sketchfabUid?: string;
  sketchfabTitle?: string;
  modelUrl?: string;
}

export interface UrbanBlock {
  id: string;
  code: string;
  name: string;
  category: 'residential' | 'commercial' | 'school' | 'equipments' | 'park' | 'subdivision';
  polygon: Point[]; // Block boundary polygon in meters
  labelPoint?: Point;
  color?: string;
  description?: string;
  buildingCount?: number;
}

export interface PedestrianAlley {
  id: string;
  code: string;
  name: string;
  type: 'ruelle_principale' | 'venelle' | 'passage_traverse' | 'promenade_arberee';
  path: Point[];
  width: number; // width in meters (e.g. 4m to 10m)
  isPedestrianOnly: boolean;
  hasTrees?: boolean;
  flowFactor?: number;
  description?: string;
}

export interface SpatialLayout {
  width: number; // in meters (e.g. 500m)
  height: number; // in meters (e.g. 400m)
  buildings: Building[];
  streets: StreetCorridor[];
  blocks?: UrbanBlock[];
  ruelles?: PedestrianAlley[];
  vegetationZones: VegetationZone[];
  market: MarketZone;
  visitorGates: VisitorGate[];
  urbanFurniture?: UrbanFurniture[];
  note: string;
  referencePlanUrl?: string;
  metersPerPixel?: number;
}

export interface HourlyClimateData {
  hour: number; // 9, 13, 18
  temperatureC: number;
  relativeHumidityPercent: number;
  windSpeedMs: number;
  source: 'ENVI-met' | 'Importé' | 'Synthétique';
}

export interface ClimateParams {
  observations: HourlyClimateData[];
  interpolation: InterpolationMethod;
  vegetationCoolingDeltaC: number; // microclimatic cooling delta due to trees
  vegetationWindReductionFactor: number; // wind attenuation due to canopy
}

export interface ContaminationParams {
  baseTransmissionRatePerMinute: number; // p_base (hypothèse illustrative)
  contactDistanceThresholdMeters: number; // default 2.0m
  distanceDecayPower: number; // k in (1 - d/d_max)^k
  temperatureOptimumC: number;
  humidityEffectEnabled: boolean;
  windDispersionEnabled: boolean;
  vegetationFiltrationEnabled: boolean;
  distanceEffectEnabled: boolean;
  durationEffectEnabled: boolean;
  surfaceTransmissionEnabled: boolean;
  surfaceTransmissionRate: number;
  recoveryRatePerMinute: number; // for SIR (gamma)
}

export interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  shortDescription: string;
  details: string;
  epidemicModel: EpidemicModel;
  initialPopulation: number;
  initialInfectedCount: number;
  visitorCountPerHour: number;
  pedestrianSpeedMs: number; // e.g. 1.2 m/s
  flowMultiplierByStreet: {
    RueA: number;
    RueB: number;
    RueC: number;
    RueD: number;
  };
  climate: ClimateParams;
  contamination: ContaminationParams;
  marketRelocated: boolean;
  marketPosition: Point;
  additionalVegetation: boolean;
  seed: number;
}

export type DemographicGroup = 'elderly' | 'adult' | 'child';

export interface Agent {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  street: 'RueA' | 'RueB' | 'RueC' | 'RueD';
  isVisitor: boolean;
  state: HealthState;
  infectionStep?: number;
  cumulativeContacts: number;
  entryStep: number;
  dwellTimeRemaining: number;
  activeEpisodesWith: Set<number>;
  demographic?: DemographicGroup;
  familyId?: number;
  maskWearing?: boolean;
  transmissionPathway?: 'aerosol' | 'fomite';
  waypoints?: Point[];
  currentWaypointIdx?: number;
  destinationNodeId?: string;
  currentNodeId?: string;
  previousNodeId?: string;
  lateralOffset?: number;
  /** Destination en cours (repère simulation, mètres) et pause à l'arrivée. */
  navDestX?: number;
  navDestY?: number;
  navPauseUntil?: number;
}

export interface StepMetric {
  step: number; // 0 to 540
  simulatedMinutes: number; // 0 to 540
  clockTime: string; // e.g. "09:00", "13:25"
  populationPresent: number;
  susceptibleCount: number;
  infectiousCount: number;
  removedCount: number;
  infectiousPercentage: number;
  proximityContacts: number; // instant pairs within threshold
  uniquePairsInContact: number;
  contactEpisodes: number; // cumulative ongoing / completed episodes
  cumulativeContacts: number; // running total of pair encounters
  newInfections: number;
  temperature: number;
  relativeHumidity: number;
  windSpeed: number;
  visitorsPresent: number;
  contactsUnder025m?: number;
  contactsUnder1m?: number;
  contactsUnder2m?: number;
  airTransmissions?: number;
  surfaceTransmissions?: number;
  peakHourActive?: '09:00 (Matin)' | '13:00 (Midi)' | '18:00 (Soir)' | null;
  flowSurgeFactor?: number;
  streetFlows: {
    RueA: number;
    RueB: number;
    RueC: number;
    RueD: number;
  };
}

export interface SimulationResult {
  experimentId: string;
  scenarioId: ScenarioId;
  scenarioName: string;
  replicationIndex: number;
  seed: number;
  totalSteps: number;
  metrics: StepMetric[];
  finalMetrics: {
    totalContacts: number;
    peakInfectious: number;
    finalInfectious: number;
    finalInfectiousPercentage: number;
    attackRate: number; // percentage of initially susceptible infected
    totalEpisodes: number;
    avgContactsPerAgent: number;
  };
  configSnapshot: ScenarioConfig;
  completedAt: string;
}

export interface ReplicationRunDetail {
  repIndex: number;
  seed: number;
  finalContacts: number;
  finalInfected: number;
  finalInfectedPercent: number;
  peakInfected: number;
  attackRate: number;
  totalEpisodes: number;
}

export interface ScenarioReplicationStats {
  scenarioId: ScenarioId;
  scenarioName: string;
  replicationCount: number;
  seeds: number[];
  meanFinalContacts: number;
  sdFinalContacts: number;
  seFinalContacts: number;
  medianFinalContacts: number;
  iqrFinalContacts: number;
  minFinalContacts: number;
  maxFinalContacts: number;
  ci95FinalContacts: [number, number];
  meanFinalInfected: number;
  sdFinalInfected: number;
  seFinalInfected: number;
  medianFinalInfected: number;
  iqrFinalInfected: number;
  minFinalInfected: number;
  maxFinalInfected: number;
  ci95FinalInfected: [number, number];
  meanInfectedPercent: number;
  sdInfectedPercent: number;
  meanAttackRate: number;
  sdAttackRate: number;
  deltaContactsVsS0Percent: number | null | 'non calculable'; // null if S0, 'non calculable' if division by zero
  deltaInfectedVsS0Percent: number | null | 'non calculable';
  pairedDeltaContactsVsS0?: {
    meanDiff: number;
    sdDiff: number;
    seDiff: number;
    ci95: [number, number];
    pValueEstimate?: number;
  };
  replicationsDetails: ReplicationRunDetail[];
  timeSeriesMean: {
    minutes: number[];
    contactsMean: number[];
    contactsSd: number[];
    contactsSe: number[];
    contactsCi95Lower: number[];
    contactsCi95Upper: number[];
    infectedMean: number[];
    infectedSd: number[];
    infectedSe: number[];
    infectedCi95Lower: number[];
    infectedCi95Upper: number[];
    individualTraces: Array<{
      repIndex: number;
      seed: number;
      contacts: number[];
      infected: number[];
    }>;
  };
}

export interface SensitivityParamConfig {
  paramKey: string;
  label: string;
  unit: string;
  values: number[];
  baselineValue: number;
}

export interface SensitivityResult {
  paramKey: string;
  label: string;
  testedValues: number[];
  contactsOutcome: number[];
  infectedOutcome: number[];
  notes: string;
}

export interface InvariantTestResult {
  id: number;
  title: string;
  hypothesis: string;
  passed: boolean;
  details: string;
  executionTimeMs: number;
  observedValues: Record<string, string | number | boolean>;
}

export interface AnyLogicMappingRow {
  appletVariable: string;
  anylogicParameter: string;
  unit: string;
  type: string;
  description: string;
  notes: string;
}
