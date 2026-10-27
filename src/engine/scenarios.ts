/**
 * Scenario Definitions: S0, S1, S2, S3, S4
 * Each scenario encapsulates independent, immutable parameters.
 */

import { DEFAULT_CLIMATE_PARAMS } from './environmental';
import { RELOCATED_MARKET_POSITION } from './spatial';
import { ContaminationParams, ScenarioConfig, ScenarioId } from '../types/simulation';

export const BASE_CONTAMINATION_PARAMS: ContaminationParams = {
  baseTransmissionRatePerMinute: 0.045, // Hypothèse illustrative non calibrée
  contactDistanceThresholdMeters: 2.0, // Distance de contact de référence (2m)
  distanceDecayPower: 1.5,
  temperatureOptimumC: 20.0,
  humidityEffectEnabled: true,
  windDispersionEnabled: true,
  vegetationFiltrationEnabled: true,
  distanceEffectEnabled: true,
  durationEffectEnabled: true,
  surfaceTransmissionEnabled: false,
  surfaceTransmissionRate: 0.005,
  recoveryRatePerMinute: 0.0005, // pour SIR (~20-40h de convalescence simulée)
};

export const SCENARIO_PRESETS: Record<ScenarioId, ScenarioConfig> = {
  S0: {
    id: 'S0',
    name: 'S0 — État existant (Référence)',
    shortDescription: 'Configuration de référence UV9 avec marché informel sur l’axe commercial central (Rue A).',
    details: 'Marché informel implanté au cœur de la Rue A, végétation éparse d’origine, flux piétons concentrés sur l’axe central marchand.',
    epidemicModel: 'SI',
    initialPopulation: 160,
    initialInfectedCount: 4, // 2.5% infectieux initialement (faible fraction réaliste, jamais 80%)
    visitorCountPerHour: 75,
    pedestrianSpeedMs: 1.2,
    flowMultiplierByStreet: {
      RueA: 1.0, // 100% (flux fort)
      RueB: 1.0,
      RueC: 1.0,
      RueD: 1.0,
    },
    climate: JSON.parse(JSON.stringify(DEFAULT_CLIMATE_PARAMS)),
    contamination: { ...BASE_CONTAMINATION_PARAMS },
    marketRelocated: false,
    marketPosition: { x: 278, y: 196 },
    additionalVegetation: false,
    seed: 42,
  },

  S1: {
    id: 'S1',
    name: 'S1 — Végétation accrue',
    shortDescription: 'Ajout d’alignements arborés d’ombrage le long de la Rue A et îlots de fraîcheur.',
    details: 'Implantation d’arbres de haute tige le long de l’axe Rue A et densification du parc sud-ouest. Modifie le microclimat (rafraîchissement local et filtration aérosol).',
    epidemicModel: 'SI',
    initialPopulation: 160,
    initialInfectedCount: 4,
    visitorCountPerHour: 75,
    pedestrianSpeedMs: 1.2,
    flowMultiplierByStreet: {
      RueA: 1.0,
      RueB: 1.0,
      RueC: 1.0,
      RueD: 1.0,
    },
    climate: {
      ...JSON.parse(JSON.stringify(DEFAULT_CLIMATE_PARAMS)),
      vegetationCoolingDeltaC: 3.8,
    },
    contamination: { ...BASE_CONTAMINATION_PARAMS },
    marketRelocated: false,
    marketPosition: { x: 278, y: 196 },
    additionalVegetation: true,
    seed: 42,
  },

  S2: {
    id: 'S2',
    name: 'S2 — Flux réorganisés',
    shortDescription: 'Régulation et déviation des flux piétonniers de la Rue A vers les Rues B et C.',
    details: 'Signalétique urbaine, incitations d’itinéraires alternatifs et répartition des flux : allègement de 35% de la Rue A reporté vers les venelles calmes B et C.',
    epidemicModel: 'SI',
    initialPopulation: 160,
    initialInfectedCount: 4,
    visitorCountPerHour: 75,
    pedestrianSpeedMs: 1.25,
    flowMultiplierByStreet: {
      RueA: 0.65, // -35% sur l'axe central
      RueB: 1.25, // +25%
      RueC: 1.30, // +30%
      RueD: 1.05,
    },
    climate: JSON.parse(JSON.stringify(DEFAULT_CLIMATE_PARAMS)),
    contamination: { ...BASE_CONTAMINATION_PARAMS },
    marketRelocated: false,
    marketPosition: { x: 278, y: 196 },
    additionalVegetation: false,
    seed: 42,
  },

  S3: {
    id: 'S3',
    name: 'S3 — Marché déplacé',
    shortDescription: 'Relocalisation du marché informel vers l’esplanade aérée Sud-Ouest (Rue D).',
    details: 'Déplacement des 36 étals de vente hors du goulot d’étranglement de la Rue A vers une esplanade aérée et spacieuse en bordure de la Rue D.',
    epidemicModel: 'SI',
    initialPopulation: 160,
    initialInfectedCount: 4,
    visitorCountPerHour: 75,
    pedestrianSpeedMs: 1.2,
    flowMultiplierByStreet: {
      RueA: 0.85,
      RueB: 1.0,
      RueC: 1.05,
      RueD: 1.25,
    },
    climate: JSON.parse(JSON.stringify(DEFAULT_CLIMATE_PARAMS)),
    contamination: { ...BASE_CONTAMINATION_PARAMS },
    marketRelocated: true,
    marketPosition: { x: 220, y: 350 },
    additionalVegetation: false,
    seed: 42,
  },

  S4: {
    id: 'S4',
    name: 'S4 — Combinaison intégrée',
    shortDescription: 'Application combinée des scénarios S1 (végétation) + S2 (flux) + S3 (marché déplacé).',
    details: 'Stratégie globale d’urbanisme résilient : canopée d’ombrage Rue A, décongestion des flux vers B et C, et relocalisation du marché vers l’esplanade ventilée.',
    epidemicModel: 'SI',
    initialPopulation: 160,
    initialInfectedCount: 4,
    visitorCountPerHour: 75,
    pedestrianSpeedMs: 1.25,
    flowMultiplierByStreet: {
      RueA: 0.65,
      RueB: 1.25,
      RueC: 1.30,
      RueD: 1.25,
    },
    climate: {
      ...JSON.parse(JSON.stringify(DEFAULT_CLIMATE_PARAMS)),
      vegetationCoolingDeltaC: 2.8,
    },
    contamination: { ...BASE_CONTAMINATION_PARAMS },
    marketRelocated: true,
    marketPosition: { ...RELOCATED_MARKET_POSITION },
    additionalVegetation: true,
    seed: 42,
  },
};

/**
 * Returns a deep clone of a scenario config to guarantee immutability during execution.
 */
export function cloneScenarioConfig(config: ScenarioConfig): ScenarioConfig {
  return JSON.parse(JSON.stringify(config));
}
