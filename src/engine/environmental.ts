/**
 * Environmental & Microclimate Module:
 * ENVI-met observations (9h, 13h, 18h), interpolation methods (linear vs step),
 * and local microclimatic adjustments (vegetation shade & wind damping).
 */

import { ClimateParams, HourlyClimateData, InterpolationMethod } from '../types/simulation';

export const DEFAULT_ENVIMET_OBSERVATIONS: HourlyClimateData[] = [
  { hour: 9, temperatureC: 32.5, relativeHumidityPercent: 50.0, windSpeedMs: 3.2, source: 'ENVI-met' },
  { hour: 13, temperatureC: 45.0, relativeHumidityPercent: 50.0, windSpeedMs: 5.49, source: 'ENVI-met' },
  { hour: 18, temperatureC: 38.0, relativeHumidityPercent: 50.0, windSpeedMs: 4.8, source: 'ENVI-met' },
];

export const DEFAULT_CLIMATE_PARAMS: ClimateParams = {
  observations: DEFAULT_ENVIMET_OBSERVATIONS,
  interpolation: 'linear',
  vegetationCoolingDeltaC: 3.5, // Microclimate cooling (up to -3.5°C under dense tree canopy in Ali Mendjeli)
  vegetationWindReductionFactor: 0.42, // 42% attenuation of wind speed and aerosol interception under dense canopy
};

/**
 * Converts simulated step (0 to 540) to hour and minute.
 * 0 = 09:00, 540 = 18:00
 */
export function stepToClockTime(step: number): { hour: number; minute: number; formatted: string } {
  const totalMinutes = 9 * 60 + Math.max(0, Math.min(540, step));
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { hour, minute, formatted };
}

/**
 * Interpolates ambient environmental conditions for a specific minute of simulation (0 to 540).
 */
export function getAmbientClimate(
  simulatedMinutes: number,
  params: ClimateParams
): { temperature: number; relativeHumidity: number; windSpeed: number; isInterpolated: boolean } {
  const currentHourDecimal = 9 + simulatedMinutes / 60;
  const obs = [...params.observations].sort((a, b) => a.hour - b.hour);

  if (obs.length === 0) {
    return { temperature: 25, relativeHumidity: 50, windSpeed: 2.0, isInterpolated: false };
  }

  // Exact match with an observation
  const exact = obs.find((o) => Math.abs(o.hour - currentHourDecimal) < 1e-4);
  if (exact) {
    return {
      temperature: exact.temperatureC,
      relativeHumidity: exact.relativeHumidityPercent,
      windSpeed: exact.windSpeedMs,
      isInterpolated: false,
    };
  }

  if (params.interpolation === 'step') {
    // Last known value before or at current hour
    let chosen = obs[0];
    for (const o of obs) {
      if (o.hour <= currentHourDecimal) {
        chosen = o;
      }
    }
    return {
      temperature: chosen.temperatureC,
      relativeHumidity: chosen.relativeHumidityPercent,
      windSpeed: chosen.windSpeedMs,
      isInterpolated: true,
    };
  }

  // Linear interpolation
  if (currentHourDecimal <= obs[0].hour) {
    return {
      temperature: obs[0].temperatureC,
      relativeHumidity: obs[0].relativeHumidityPercent,
      windSpeed: obs[0].windSpeedMs,
      isInterpolated: true,
    };
  }

  if (currentHourDecimal >= obs[obs.length - 1].hour) {
    const last = obs[obs.length - 1];
    return {
      temperature: last.temperatureC,
      relativeHumidity: last.relativeHumidityPercent,
      windSpeed: last.windSpeedMs,
      isInterpolated: true,
    };
  }

  // Bracket between two observations
  for (let i = 0; i < obs.length - 1; i++) {
    const o1 = obs[i];
    const o2 = obs[i + 1];
    if (currentHourDecimal >= o1.hour && currentHourDecimal <= o2.hour) {
      const alpha = (currentHourDecimal - o1.hour) / (o2.hour - o1.hour);
      const temperature = o1.temperatureC + alpha * (o2.temperatureC - o1.temperatureC);
      const relativeHumidity = o1.relativeHumidityPercent + alpha * (o2.relativeHumidityPercent - o1.relativeHumidityPercent);
      const windSpeed = o1.windSpeedMs + alpha * (o2.windSpeedMs - o1.windSpeedMs);
      return {
        temperature: Number(temperature.toFixed(2)),
        relativeHumidity: Number(relativeHumidity.toFixed(2)),
        windSpeed: Number(windSpeed.toFixed(2)),
        isInterpolated: true,
      };
    }
  }

  return {
    temperature: obs[0].temperatureC,
    relativeHumidity: obs[0].relativeHumidityPercent,
    windSpeed: obs[0].windSpeedMs,
    isInterpolated: true,
  };
}
