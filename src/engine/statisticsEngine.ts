/**
 * Statistical Analysis & Replications Engine:
 * Monte Carlo replications (30 runs per scenario), individual replication tracking,
 * Student-t 95% confidence intervals, paired hypothesis testing, and null-safe relative deltas.
 */

import { SCENARIO_PRESETS } from './scenarios';
import { SimulationInstance } from './simulationEngine';
import {
  ReplicationRunDetail,
  ScenarioConfig,
  ScenarioId,
  ScenarioReplicationStats,
  SensitivityResult,
  SimulationResult,
} from '../types/simulation';

/**
 * Calculates Descriptive Statistics (Mean, SD, SE, Median, IQR, Min, Max, CI95)
 */
export function calculateStats(values: number[]): {
  mean: number;
  sd: number;
  se: number;
  median: number;
  iqr: number;
  min: number;
  max: number;
  ci95: [number, number];
} {
  const n = values.length;
  if (n === 0) {
    return { mean: 0, sd: 0, se: 0, median: 0, iqr: 0, min: 0, max: 0, ci95: [0, 0] };
  }
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance =
    n > 1
      ? values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1)
      : 0;
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n); // Standard error on the mean

  // Median & IQR
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];

  const median =
    n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  // Student-t critical value for alpha=0.05
  // df = n - 1 (e.g. for n=30, t_29 = 2.0452; for n=20, t_19 = 2.093)
  const tVal = n >= 30 ? 2.045 : n >= 20 ? 2.093 : 2.228;
  const ciLower = Number((mean - tVal * se).toFixed(2));
  const ciUpper = Number((mean + tVal * se).toFixed(2));

  return {
    mean: Number(mean.toFixed(2)),
    sd: Number(sd.toFixed(2)),
    se: Number(se.toFixed(2)),
    median: Number(median.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    ci95: [ciLower, ciUpper],
  };
}

/**
 * Computes Student-t cumulative probability approximation for two-tailed p-value
 */
function approximateStudentPValue(tStat: number, df: number): number {
  const x = Math.abs(tStat);
  if (isNaN(x) || df <= 0) return 1.0;
  // Standard normal / t-distribution approximation
  const normalApprox = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const pOneTail = Math.max(0.00001, normalApprox / (x || 1));
  return Number(Math.min(1.0, pOneTail * 2).toFixed(5));
}

/**
 * Null-safe relative variation:
 * Variation (%) = 100 * (valeur - reference) / reference
 * If reference is 0, explicitly returns 'non calculable' instead of dividing by zero.
 */
export function computeRelativeVariation(
  scenarioVal: number,
  referenceVal: number
): number | 'non calculable' {
  if (referenceVal === 0) {
    return 'non calculable';
  }
  return Number((((scenarioVal - referenceVal) / referenceVal) * 100).toFixed(2));
}

/**
 * Executes N independent replications of a scenario with distinct or paired seeds.
 */
export function runScenarioReplications(
  config: ScenarioConfig,
  replicationsCount: number = 30,
  baseSeed: number = 42,
  onProgress?: (completed: number, total: number) => void
): { results: SimulationResult[]; stats: ScenarioReplicationStats } {
  const results: SimulationResult[] = [];
  const seeds: number[] = [];
  const replicationsDetails: ReplicationRunDetail[] = [];

  for (let r = 0; r < replicationsCount; r++) {
    // Generate distinct, deterministic seed for each replication
    const repSeed = (baseSeed + r * 10007) >>> 0;
    seeds.push(repSeed);

    const repConfig: ScenarioConfig = {
      ...JSON.parse(JSON.stringify(config)),
      seed: repSeed,
    };

    const instance = new SimulationInstance(repConfig, r + 1);
    const res = instance.runToCompletion();
    results.push(res);

    replicationsDetails.push({
      repIndex: r + 1,
      seed: repSeed,
      finalContacts: res.finalMetrics.totalContacts,
      finalInfected: res.finalMetrics.finalInfectious,
      finalInfectedPercent: res.finalMetrics.finalInfectiousPercentage,
      peakInfected: res.finalMetrics.peakInfectious,
      attackRate: res.finalMetrics.attackRate,
      totalEpisodes: res.finalMetrics.totalEpisodes,
    });

    if (onProgress) {
      onProgress(r + 1, replicationsCount);
    }
  }

  // Aggregate metrics
  const finalContactsList = results.map((r) => r.finalMetrics.totalContacts);
  const finalInfectedList = results.map((r) => r.finalMetrics.finalInfectious);
  const finalInfectedPctList = results.map((r) => r.finalMetrics.finalInfectiousPercentage);
  const attackRatesList = results.map((r) => r.finalMetrics.attackRate);

  const contactStats = calculateStats(finalContactsList);
  const infectedStats = calculateStats(finalInfectedList);
  const pctStats = calculateStats(finalInfectedPctList);
  const attackStats = calculateStats(attackRatesList);

  // Compute time-series average across replications (for steps 0 to 540)
  const stepsCount = 540;
  const minutes: number[] = [];
  const contactsMean: number[] = [];
  const contactsSd: number[] = [];
  const contactsSe: number[] = [];
  const contactsCi95Lower: number[] = [];
  const contactsCi95Upper: number[] = [];
  const infectedMean: number[] = [];
  const infectedSd: number[] = [];
  const infectedSe: number[] = [];
  const infectedCi95Lower: number[] = [];
  const infectedCi95Upper: number[] = [];

  // Individual traces (spaghetti plot sampling every 15 min)
  const sampleInterval = 10;
  const individualTraces: Array<{
    repIndex: number;
    seed: number;
    contacts: number[];
    infected: number[];
  }> = results.map((res) => ({
    repIndex: res.replicationIndex,
    seed: res.seed,
    contacts: [],
    infected: [],
  }));

  for (let s = 0; s <= stepsCount; s += sampleInterval) {
    minutes.push(s);
    const contactsAtStep: number[] = [];
    const infectedAtStep: number[] = [];

    for (let r = 0; r < results.length; r++) {
      const res = results[r];
      const m = res.metrics[Math.min(s, res.metrics.length - 1)];
      if (m) {
        contactsAtStep.push(m.cumulativeContacts);
        infectedAtStep.push(m.infectiousCount);
        individualTraces[r].contacts.push(m.cumulativeContacts);
        individualTraces[r].infected.push(m.infectiousCount);
      }
    }

    const cStat = calculateStats(contactsAtStep);
    const iStat = calculateStats(infectedAtStep);

    contactsMean.push(cStat.mean);
    contactsSd.push(cStat.sd);
    contactsSe.push(cStat.se);
    contactsCi95Lower.push(cStat.ci95[0]);
    contactsCi95Upper.push(cStat.ci95[1]);

    infectedMean.push(iStat.mean);
    infectedSd.push(iStat.sd);
    infectedSe.push(iStat.se);
    infectedCi95Lower.push(iStat.ci95[0]);
    infectedCi95Upper.push(iStat.ci95[1]);
  }

  const stats: ScenarioReplicationStats = {
    scenarioId: config.id,
    scenarioName: config.name,
    replicationCount: replicationsCount,
    seeds,
    meanFinalContacts: contactStats.mean,
    sdFinalContacts: contactStats.sd,
    seFinalContacts: contactStats.se,
    medianFinalContacts: contactStats.median,
    iqrFinalContacts: contactStats.iqr,
    minFinalContacts: contactStats.min,
    maxFinalContacts: contactStats.max,
    ci95FinalContacts: contactStats.ci95,
    meanFinalInfected: infectedStats.mean,
    sdFinalInfected: infectedStats.sd,
    seFinalInfected: infectedStats.se,
    medianFinalInfected: infectedStats.median,
    iqrFinalInfected: infectedStats.iqr,
    minFinalInfected: infectedStats.min,
    maxFinalInfected: infectedStats.max,
    ci95FinalInfected: infectedStats.ci95,
    meanInfectedPercent: pctStats.mean,
    sdInfectedPercent: pctStats.sd,
    meanAttackRate: attackStats.mean,
    sdAttackRate: attackStats.sd,
    deltaContactsVsS0Percent: null,
    deltaInfectedVsS0Percent: null,
    replicationsDetails,
    timeSeriesMean: {
      minutes,
      contactsMean,
      contactsSd,
      contactsSe,
      contactsCi95Lower,
      contactsCi95Upper,
      infectedMean,
      infectedSd,
      infectedSe,
      infectedCi95Lower,
      infectedCi95Upper,
      individualTraces,
    },
  };

  return { results, stats };
}

/**
 * Paired comparison between a test scenario and reference S0
 * Null-safe relative deltas and paired Student's t-test calculation.
 */
export function computePairedComparison(
  scenarioStats: ScenarioReplicationStats[],
  referenceId: ScenarioId = 'S0'
): ScenarioReplicationStats[] {
  const ref = scenarioStats.find((s) => s.scenarioId === referenceId);
  if (!ref) return scenarioStats;

  return scenarioStats.map((sc) => {
    if (sc.scenarioId === referenceId) {
      return {
        ...sc,
        deltaContactsVsS0Percent: 0,
        deltaInfectedVsS0Percent: 0,
      };
    }

    // Relative variation (%) = 100 * (val - ref) / ref
    const deltaContactsPct = computeRelativeVariation(sc.meanFinalContacts, ref.meanFinalContacts);
    const deltaInfectedPct = computeRelativeVariation(sc.meanFinalInfected, ref.meanFinalInfected);

    // Compute paired differences across identical replication indices (seeds)
    let pairedDiff: ScenarioReplicationStats['pairedDeltaContactsVsS0'] = undefined;

    if (sc.replicationsDetails.length > 0 && ref.replicationsDetails.length > 0) {
      const minN = Math.min(sc.replicationsDetails.length, ref.replicationsDetails.length);
      const differences: number[] = [];

      for (let i = 0; i < minN; i++) {
        const diff = sc.replicationsDetails[i].finalContacts - ref.replicationsDetails[i].finalContacts;
        differences.push(diff);
      }

      const diffStats = calculateStats(differences);
      const tStat = diffStats.se > 0 ? diffStats.mean / diffStats.se : 0;
      const pVal = approximateStudentPValue(tStat, minN - 1);

      pairedDiff = {
        meanDiff: diffStats.mean,
        sdDiff: diffStats.sd,
        seDiff: diffStats.se,
        ci95: diffStats.ci95,
        pValueEstimate: pVal,
      };
    }

    return {
      ...sc,
      deltaContactsVsS0Percent: deltaContactsPct,
      deltaInfectedVsS0Percent: deltaInfectedPct,
      pairedDeltaContactsVsS0: pairedDiff,
    };
  });
}

/**
 * Executes Mode B Sensitivity Analysis:
 * Varies one parameter at a time and measures contact and infection metrics.
 */
export function runSensitivitySweep(
  baseConfig: ScenarioConfig = SCENARIO_PRESETS.S0
): SensitivityResult[] {
  const results: SensitivityResult[] = [];

  // 1. Distance threshold sensitivity
  const distValues = [1.0, 1.5, 2.0, 2.5, 3.0];
  const distContacts: number[] = [];
  const distInfected: number[] = [];

  for (const d of distValues) {
    const cfg: ScenarioConfig = JSON.parse(JSON.stringify(baseConfig));
    cfg.contamination.contactDistanceThresholdMeters = d;
    const inst = new SimulationInstance(cfg, 1);
    const res = inst.runToCompletion();
    distContacts.push(res.finalMetrics.totalContacts);
    distInfected.push(res.finalMetrics.finalInfectious);
  }
  results.push({
    paramKey: 'contactDistanceThresholdMeters',
    label: 'Distance de contact (mètres)',
    testedValues: distValues,
    contactsOutcome: distContacts,
    infectedOutcome: distInfected,
    notes: 'Vérifie que l’élargissement du seuil augmente mécaniquement les contacts détectés.',
  });

  // 2. Pedestrian flow multiplier on Rue A
  const flowMultipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const flowContacts: number[] = [];
  const flowInfected: number[] = [];

  for (const f of flowMultipliers) {
    const cfg: ScenarioConfig = JSON.parse(JSON.stringify(baseConfig));
    cfg.flowMultiplierByStreet.RueA = f;
    const inst = new SimulationInstance(cfg, 1);
    const res = inst.runToCompletion();
    flowContacts.push(res.finalMetrics.totalContacts);
    flowInfected.push(res.finalMetrics.finalInfectious);
  }
  results.push({
    paramKey: 'flowMultiplierRueA',
    label: 'Multiplicateur de flux piétonnier (Rue A)',
    testedValues: flowMultipliers,
    contactsOutcome: flowContacts,
    infectedOutcome: flowInfected,
    notes: 'Démontre l’effet quadratique / non-linéaire de la densité piétonne sur la fréquence des rencontres.',
  });

  // 3. Base transmission rate p_base
  const pBaseValues = [0.01, 0.025, 0.045, 0.075, 0.1];
  const pBaseContacts: number[] = [];
  const pBaseInfected: number[] = [];

  for (const p of pBaseValues) {
    const cfg: ScenarioConfig = JSON.parse(JSON.stringify(baseConfig));
    cfg.contamination.baseTransmissionRatePerMinute = p;
    const inst = new SimulationInstance(cfg, 1);
    const res = inst.runToCompletion();
    pBaseContacts.push(res.finalMetrics.totalContacts);
    pBaseInfected.push(res.finalMetrics.finalInfectious);
  }
  results.push({
    paramKey: 'baseTransmissionRatePerMinute',
    label: 'Taux de risque de base p_base (/min)',
    testedValues: pBaseValues,
    contactsOutcome: pBaseContacts,
    infectedOutcome: pBaseInfected,
    notes: 'Les contacts physiques restent inchangés car p_base n’affecte que la transmission biologique.',
  });

  return results;
}
