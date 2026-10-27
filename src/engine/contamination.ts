/**
 * Contamination & Transmission Risk Module:
 * Modular scientific formulation of outdoor exposure risk.
 * NOTE: Hypothèse illustrative non calibrée sur des données cliniques réelles.
 * Serves for relative scenario comparison, not clinical outcome prediction.
 */

import { ContaminationParams } from '../types/simulation';

export interface FactorBreakdown {
  distanceFactor: number;
  climateFactor: number;
  windFactor: number;
  vegetationFactor: number;
  effectiveLambda: number;
  instantaneousProbability: number;
  isSurfaceTransmission: boolean;
}

/**
 * Distance decay factor f_distance(d)
 * For d in [0, d_max], returns (1 - d/d_max)^k in [0, 1].
 */
export function calculateDistanceFactor(
  distanceMeters: number,
  thresholdMeters: number,
  power: number = 1.5,
  enabled: boolean = true
): number {
  if (!enabled) return 1.0;
  if (distanceMeters >= thresholdMeters) return 0.0;
  if (distanceMeters <= 0) return 1.0;
  const ratio = Math.max(0, Math.min(1, 1 - distanceMeters / thresholdMeters));
  return Math.pow(ratio, power);
}

/**
 * Climate factor f_climat(T, RH)
 * Hypothèse illustrative non calibrée : impact conjoint de la température de l'air (°C)
 * et de l'humidité relative (%) sur la viabilité / suspension des gouttelettes en extérieur.
 * Produces values strictly in [0.1, 1.0].
 */
export function calculateClimateFactor(
  temperatureC: number,
  relativeHumidityPercent: number,
  enabled: boolean = true
): number {
  if (!enabled) return 1.0;

  // Température: viabilité accrue entre 15°C et 22°C en extérieur, décroissance aux fortes chaleurs
  const tempDeviation = Math.abs(temperatureC - 20);
  const tempMod = Math.max(0.3, Math.min(1.0, 1.0 - 0.025 * tempDeviation));

  // Humidité: hygroscopicité des microgouttelettes (40-65% favorable au maintien aérosol)
  let rhMod = 0.8;
  if (relativeHumidityPercent >= 40 && relativeHumidityPercent <= 65) {
    rhMod = 1.0;
  } else if (relativeHumidityPercent < 40) {
    rhMod = 0.65; // évaporation rapide produisant des noyaux hautement dispersés par le vent
  } else {
    rhMod = 0.85; // humidité élevée favorisant la sédimentation rapide au sol
  }

  const combined = tempMod * rhMod;
  return Math.max(0.1, Math.min(1.0, combined));
}

/**
 * Wind dispersion factor f_vent(v)
 * Hypothèse illustrative : en milieu extérieur ouvert, la vitesse du vent accélère
 * la dilution et la dispersion turbulente des panaches respiratoires.
 * Formulation: 1 / (1 + alpha * v) in (0, 1].
 */
export function calculateWindFactor(
  windSpeedMs: number,
  enabled: boolean = true
): number {
  if (!enabled) return 1.0;
  const v = Math.max(0, windSpeedMs);
  const alpha = 0.35; // coefficient de dispersion hypothétique
  const factor = 1.0 / (1.0 + alpha * v);
  return Math.max(0.05, Math.min(1.0, factor));
}

/**
 * Vegetation deposition & filtration factor f_vegetation(g)
 * Hypothèse illustrative : les écrans végétaux denses captent une fraction
 * des micro-particules et réduisent les turbulences locales directes.
 * Produces values in [0.70, 1.0].
 */
export function calculateVegetationFactor(
  isUnderCanopy: boolean,
  canopyDensity: number = 0.5,
  enabled: boolean = true
): number {
  if (!enabled || !isUnderCanopy) return 1.0;
  const filtrationEffect = 0.28 * Math.max(0, Math.min(1, canopyDensity));
  return Math.max(0.70, Math.min(1.0, 1.0 - filtrationEffect));
}

/**
 * Computes transmission probability for an exposure episode between a susceptible
 * and an infectious agent during time step deltaMinutes (default 1 minute).
 * Formulation: P = 1 - exp(-lambda * deltaMinutes)
 * Guaranteed to be in [0, 1].
 */
export function computeTransmissionRisk(
  distanceMeters: number,
  temperatureC: number,
  relativeHumidityPercent: number,
  windSpeedMs: number,
  isUnderCanopy: boolean,
  canopyDensity: number,
  durationMinutes: number,
  params: ContaminationParams
): { probability: number; breakdown: FactorBreakdown } {
  const fDist = calculateDistanceFactor(
    distanceMeters,
    params.contactDistanceThresholdMeters,
    params.distanceDecayPower,
    params.distanceEffectEnabled
  );

  // If beyond distance threshold and surface transmission is off, risk is exactly 0
  if (fDist <= 0 && !params.surfaceTransmissionEnabled) {
    return {
      probability: 0,
      breakdown: {
        distanceFactor: 0,
        climateFactor: 1,
        windFactor: 1,
        vegetationFactor: 1,
        effectiveLambda: 0,
        instantaneousProbability: 0,
        isSurfaceTransmission: false,
      },
    };
  }

  const fClim = calculateClimateFactor(temperatureC, relativeHumidityPercent, params.humidityEffectEnabled);
  const fWind = calculateWindFactor(windSpeedMs, params.windDispersionEnabled);
  const fVeg = calculateVegetationFactor(isUnderCanopy, canopyDensity, params.vegetationFiltrationEnabled);

  // lambda represents instantaneous transmission hazard rate per minute
  let lambda = params.baseTransmissionRatePerMinute * fDist * fClim * fWind * fVeg;

  // Surface transmission component (if enabled)
  let isSurface = false;
  if (params.surfaceTransmissionEnabled && distanceMeters < 1.0) {
    lambda += params.surfaceTransmissionRate;
    isSurface = true;
  }

  const deltaT = params.durationEffectEnabled ? Math.max(0.1, durationMinutes) : 1.0;
  // Cumulative probability on duration deltaT
  const probability = Math.max(0, Math.min(1.0, 1.0 - Math.exp(-lambda * deltaT)));

  return {
    probability,
    breakdown: {
      distanceFactor: Number(fDist.toFixed(3)),
      climateFactor: Number(fClim.toFixed(3)),
      windFactor: Number(fWind.toFixed(3)),
      vegetationFactor: Number(fVeg.toFixed(3)),
      effectiveLambda: Number(lambda.toFixed(6)),
      instantaneousProbability: Number(probability.toFixed(6)),
      isSurfaceTransmission: isSurface,
    },
  };
}
