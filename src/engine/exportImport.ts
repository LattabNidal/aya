/**
 * Export and Import Module:
 * Multi-sheet XLSX generator (SheetJS), CSV time-series exporter,
 * JSON reproducibility bundle, and CSV/XLSX data validator & parser.
 * Conforms strictly to Sections 15, 18, 19 of UrbanResilience SimLab.
 */

import * as XLSX from 'xlsx';
import { SCENARIO_PRESETS } from './scenarios';
import { SimulationInstance } from './simulationEngine';
import {
  computePairedComparison,
  runScenarioReplications,
  runSensitivitySweep,
} from './statisticsEngine';
import {
  HourlyClimateData,
  ScenarioConfig,
  ScenarioId,
  ScenarioReplicationStats,
  SensitivityResult,
  SimulationResult,
  StepMetric,
} from '../types/simulation';

export const SIMULATION_ENGINE_VERSION = '1.0.0-uv9-research';

/**
 * Builds the complete 5-sheet XLSX Workbook object adhering to Section 19.
 * Can be exported in browser or inspected/validated in automated tests.
 */
export function buildMultiSheetWorkbook(
  activeResult: SimulationResult,
  allScenarioStats?: ScenarioReplicationStats[],
  allResults?: SimulationResult[],
  sensitivityData?: SensitivityResult[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // Sheet 1: Paramètres et hypothèses
  // ----------------------------------------------------
  const sheet1Data: any[][] = [
    ['UrbanResilience SimLab — Paramètres, Hypothèses et Configuration des Scénarios'],
    ['Moteur Version', SIMULATION_ENGINE_VERSION],
    ['Date d’exécution', activeResult.completedAt],
    ['Terrain d’étude', 'Unité de Voisinage 9 (UV9), Ville Nouvelle Ali Mendjeli, Constantine, Algérie'],
    ['Dimensions géométriques', '500m × 400m (Habitat collectif barres R+5 et plots R+9)'],
    ['PRNG', 'Mulberry32 déterministe reproductible'],
    ['Mention scientifique', 'Hypothèse illustrative non calibrée sur données cliniques réelles — usage comparatif relatif'],
    [],
    ['Matrice comparative des 5 scénarios d’aménagement urbain :'],
    [
      'Paramètre physique / urbain',
      'S0 — État existant (Réf)',
      'S1 — Végétation accrue',
      'S2 — Flux réorganisés',
      'S3 — Marché déplacé',
      'S4 — Combinaison intégrée',
      'Unité / Règle d’équivalence',
    ],
    [
      'Modèle épidémiologique',
      SCENARIO_PRESETS.S0.epidemicModel,
      SCENARIO_PRESETS.S1.epidemicModel,
      SCENARIO_PRESETS.S2.epidemicModel,
      SCENARIO_PRESETS.S3.epidemicModel,
      SCENARIO_PRESETS.S4.epidemicModel,
      'SI / SIR',
    ],
    [
      'Population initiale (N_0)',
      SCENARIO_PRESETS.S0.initialPopulation,
      SCENARIO_PRESETS.S1.initialPopulation,
      SCENARIO_PRESETS.S2.initialPopulation,
      SCENARIO_PRESETS.S3.initialPopulation,
      SCENARIO_PRESETS.S4.initialPopulation,
      'agents résidents',
    ],
    [
      'Infectieux initiaux (I_0)',
      SCENARIO_PRESETS.S0.initialInfectedCount,
      SCENARIO_PRESETS.S1.initialInfectedCount,
      SCENARIO_PRESETS.S2.initialInfectedCount,
      SCENARIO_PRESETS.S3.initialInfectedCount,
      SCENARIO_PRESETS.S4.initialInfectedCount,
      'agents (~2.5% population)',
    ],
    [
      'Visiteurs entrants / heure',
      SCENARIO_PRESETS.S0.visitorCountPerHour,
      SCENARIO_PRESETS.S1.visitorCountPerHour,
      SCENARIO_PRESETS.S2.visitorCountPerHour,
      SCENARIO_PRESETS.S3.visitorCountPerHour,
      SCENARIO_PRESETS.S4.visitorCountPerHour,
      'visiteurs / h (portes N, S, E, O)',
    ],
    [
      'Vitesse piétonne nominale',
      SCENARIO_PRESETS.S0.pedestrianSpeedMs,
      SCENARIO_PRESETS.S1.pedestrianSpeedMs,
      SCENARIO_PRESETS.S2.pedestrianSpeedMs,
      SCENARIO_PRESETS.S3.pedestrianSpeedMs,
      SCENARIO_PRESETS.S4.pedestrianSpeedMs,
      'm/s (réduite de 65% au marché)',
    ],
    [
      'Charge relative Rue A (Commerciale)',
      `${Math.round(SCENARIO_PRESETS.S0.flowMultiplierByStreet.RueA * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S1.flowMultiplierByStreet.RueA * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S2.flowMultiplierByStreet.RueA * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S3.flowMultiplierByStreet.RueA * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S4.flowMultiplierByStreet.RueA * 100)}%`,
      'ratio nominal (base: 420 p/h)',
    ],
    [
      'Charge relative Rue B (Résidentielle)',
      `${Math.round(SCENARIO_PRESETS.S0.flowMultiplierByStreet.RueB * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S1.flowMultiplierByStreet.RueB * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S2.flowMultiplierByStreet.RueB * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S3.flowMultiplierByStreet.RueB * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S4.flowMultiplierByStreet.RueB * 100)}%`,
      'ratio nominal (base: 180 p/h)',
    ],
    [
      'Charge relative Rue C (Liaison calme)',
      `${Math.round(SCENARIO_PRESETS.S0.flowMultiplierByStreet.RueC * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S1.flowMultiplierByStreet.RueC * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S2.flowMultiplierByStreet.RueC * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S3.flowMultiplierByStreet.RueC * 100)}%`,
      `${Math.round(SCENARIO_PRESETS.S4.flowMultiplierByStreet.RueC * 100)}%`,
      'ratio nominal (base: 110 p/h)',
    ],
    [
      'Marché informel relocalisé',
      SCENARIO_PRESETS.S0.marketRelocated ? 'Oui' : 'Non (Rue A)',
      SCENARIO_PRESETS.S1.marketRelocated ? 'Oui' : 'Non (Rue A)',
      SCENARIO_PRESETS.S2.marketRelocated ? 'Oui' : 'Non (Rue A)',
      SCENARIO_PRESETS.S3.marketRelocated ? 'Oui (Rue D)' : 'Non',
      SCENARIO_PRESETS.S4.marketRelocated ? 'Oui (Rue D)' : 'Non',
      '28 étals de vente',
    ],
    [
      'Végétation additionnelle & Ombrage',
      SCENARIO_PRESETS.S0.additionalVegetation ? 'Oui' : 'Non (Éparse)',
      SCENARIO_PRESETS.S1.additionalVegetation ? 'Oui (Alignement A)' : 'Non',
      SCENARIO_PRESETS.S2.additionalVegetation ? 'Oui' : 'Non (Éparse)',
      SCENARIO_PRESETS.S3.additionalVegetation ? 'Oui' : 'Non (Éparse)',
      SCENARIO_PRESETS.S4.additionalVegetation ? 'Oui (Canopée complète)' : 'Non',
      'Alignements Rue A + parc SW',
    ],
    [
      'Distance de contact seuil',
      `${SCENARIO_PRESETS.S0.contamination.contactDistanceThresholdMeters} m`,
      `${SCENARIO_PRESETS.S1.contamination.contactDistanceThresholdMeters} m`,
      `${SCENARIO_PRESETS.S2.contamination.contactDistanceThresholdMeters} m`,
      `${SCENARIO_PRESETS.S3.contamination.contactDistanceThresholdMeters} m`,
      `${SCENARIO_PRESETS.S4.contamination.contactDistanceThresholdMeters} m`,
      'mètres (seuil critique)',
    ],
    [
      'Taux de risque p_base',
      SCENARIO_PRESETS.S0.contamination.baseTransmissionRatePerMinute,
      SCENARIO_PRESETS.S1.contamination.baseTransmissionRatePerMinute,
      SCENARIO_PRESETS.S2.contamination.baseTransmissionRatePerMinute,
      SCENARIO_PRESETS.S3.contamination.baseTransmissionRatePerMinute,
      SCENARIO_PRESETS.S4.contamination.baseTransmissionRatePerMinute,
      'min^-1 (aléa d’exposition)',
    ],
    [
      'Graine aléatoire de référence (Seed)',
      SCENARIO_PRESETS.S0.seed,
      SCENARIO_PRESETS.S1.seed,
      SCENARIO_PRESETS.S2.seed,
      SCENARIO_PRESETS.S3.seed,
      SCENARIO_PRESETS.S4.seed,
      'Graine Mulberry32',
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Parametres_Hypotheses');

  // ----------------------------------------------------
  // Sheet 2: Résultats temporels (540 minutes)
  // ----------------------------------------------------
  const sheet2Headers = [
    'Scénario',
    'Réplication',
    'Graine',
    'Pas (min)',
    'Heure',
    'Population',
    'Susceptibles (S)',
    'Infectieux (I)',
    'Retirés (R)',
    '% Infectieux',
    'Contacts Instantanés',
    'Paires Uniques',
    'Épisodes Cumulés',
    'Contacts Cumulés Total',
    'Nouvelles Infections',
    'Température (°C)',
    'Humidité (%)',
    'Vent (m/s)',
    'Visiteurs Actifs',
    'Flux Rue A (p/h)',
    'Flux Rue B (p/h)',
    'Flux Rue C (p/h)',
    'Flux Rue D (p/h)',
  ];

  const sheet2Rows: any[][] = [sheet2Headers];
  const resultsToDump = allResults && allResults.length > 0 ? allResults : [activeResult];

  for (const res of resultsToDump) {
    for (const m of res.metrics) {
      sheet2Rows.push([
        res.scenarioId,
        res.replicationIndex,
        res.seed,
        m.step,
        m.clockTime,
        m.populationPresent,
        m.susceptibleCount,
        m.infectiousCount,
        m.removedCount,
        m.infectiousPercentage,
        m.proximityContacts,
        m.uniquePairsInContact,
        m.contactEpisodes,
        m.cumulativeContacts,
        m.newInfections,
        m.temperature,
        m.relativeHumidity,
        m.windSpeed,
        m.visitorsPresent,
        m.streetFlows.RueA,
        m.streetFlows.RueB,
        m.streetFlows.RueC,
        m.streetFlows.RueD,
      ]);
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Resultats_Temporels');

  // ----------------------------------------------------
  // Sheet 3: Statistiques par scénario (S0 à S4)
  // ----------------------------------------------------
  const sheet3Headers = [
    'Scénario',
    'Nom complet',
    'Réplications (N)',
    'Moyenne Contacts Cumulés',
    'Écart-type Contacts (SD)',
    'Erreur-type Contacts (SE)',
    'Médiane Contacts',
    'IQR Contacts',
    'Min Contacts',
    'Max Contacts',
    'IC 95% Contacts [Min - Max]',
    'Moyenne Infectés Finaux (I)',
    'Écart-type Infectés (SD)',
    'IC 95% Infectés [Min - Max]',
    '% Infectieux Moyen',
    'Taux d’attaque Moyen (%)',
    'Variation Contacts vs S0 (%)',
    'Variation Infectés vs S0 (%)',
    'Diff. Moyenne vs S0 [IC 95%]',
    'p-value (t-test apparié)',
  ];

  const sheet3Rows: any[][] = [sheet3Headers];

  if (allScenarioStats && allScenarioStats.length > 0) {
    for (const st of allScenarioStats) {
      const deltaContactsStr =
        st.deltaContactsVsS0Percent === null
          ? 'Référence (0%)'
          : st.deltaContactsVsS0Percent === 'non calculable'
          ? 'non calculable'
          : `${st.deltaContactsVsS0Percent}%`;

      const deltaInfectedStr =
        st.deltaInfectedVsS0Percent === null
          ? 'Référence (0%)'
          : st.deltaInfectedVsS0Percent === 'non calculable'
          ? 'non calculable'
          : `${st.deltaInfectedVsS0Percent}%`;

      const pairedDiffStr = st.pairedDeltaContactsVsS0
        ? `${st.pairedDeltaContactsVsS0.meanDiff > 0 ? '+' : ''}${Math.round(st.pairedDeltaContactsVsS0.meanDiff)} [${Math.round(st.pairedDeltaContactsVsS0.ci95[0])} ; ${Math.round(st.pairedDeltaContactsVsS0.ci95[1])}]`
        : '-';

      const pValStr =
        st.pairedDeltaContactsVsS0?.pValueEstimate !== undefined
          ? st.pairedDeltaContactsVsS0.pValueEstimate < 0.0001
            ? 'p < 0.0001'
            : `p = ${st.pairedDeltaContactsVsS0.pValueEstimate.toFixed(4)}`
          : '-';

      sheet3Rows.push([
        st.scenarioId,
        st.scenarioName,
        st.replicationCount,
        st.meanFinalContacts,
        st.sdFinalContacts,
        st.seFinalContacts,
        st.medianFinalContacts,
        st.iqrFinalContacts,
        st.minFinalContacts,
        st.maxFinalContacts,
        `[${st.ci95FinalContacts[0]} ; ${st.ci95FinalContacts[1]}]`,
        st.meanFinalInfected,
        st.sdFinalInfected,
        `[${st.ci95FinalInfected[0]} ; ${st.ci95FinalInfected[1]}]`,
        st.meanInfectedPercent,
        st.meanAttackRate,
        deltaContactsStr,
        deltaInfectedStr,
        pairedDiffStr,
        pValStr,
      ]);
    }
  } else {
    sheet3Rows.push([
      activeResult.scenarioId,
      activeResult.scenarioName,
      1,
      activeResult.finalMetrics.totalContacts,
      0,
      0,
      activeResult.finalMetrics.totalContacts,
      0,
      activeResult.finalMetrics.totalContacts,
      activeResult.finalMetrics.totalContacts,
      `[${activeResult.finalMetrics.totalContacts} ; ${activeResult.finalMetrics.totalContacts}]`,
      activeResult.finalMetrics.finalInfectious,
      0,
      `[${activeResult.finalMetrics.finalInfectious} ; ${activeResult.finalMetrics.finalInfectious}]`,
      activeResult.finalMetrics.finalInfectiousPercentage,
      activeResult.finalMetrics.attackRate,
      'Référence (Exécution unique)',
      'Référence (Exécution unique)',
      '-',
      '-',
    ]);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Stats_Scenarios');

  // ----------------------------------------------------
  // Sheet 4: Analyse de sensibilité
  // ----------------------------------------------------
  const sheet4Headers = ['Paramètre Testé', 'Valeur Testée', 'Contacts Finaux Observés', 'Infectés Finaux Observés', 'Interprétation Scientifique'];
  const sheet4Rows: any[][] = [sheet4Headers];
  const sensDataToUse = sensitivityData && sensitivityData.length > 0 ? sensitivityData : runSensitivitySweep(SCENARIO_PRESETS.S0);

  for (const sens of sensDataToUse) {
    for (let i = 0; i < sens.testedValues.length; i++) {
      sheet4Rows.push([
        sens.label,
        sens.testedValues[i],
        sens.contactsOutcome[i],
        sens.infectedOutcome[i],
        sens.notes,
      ]);
    }
  }

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);
  XLSX.utils.book_append_sheet(wb, ws4, 'Sensibilite');

  // ----------------------------------------------------
  // Sheet 5: Dictionnaire des variables
  // ----------------------------------------------------
  const dictRows = [
    ['Variable SimLab', 'Description & Rôle', 'Unité', 'Formule / Source Documentée'],
    ['step', 'Numéro du pas de temps simulé de 0 à 540', 'minute', 'Δt = 1 min (Pas unitaire)'],
    ['clockTime', 'Heure réelle simulée de la journée', 'HH:MM', '09:00 à 18:00 (Durée exacte 9h = 540 min)'],
    ['populationPresent', 'Effectif total d’agents résidents et visiteurs présents', 'individus', 'N_res + N_vis actifs'],
    ['susceptibleCount', 'Agents dans l’état réceptif non infecté', 'individus', 'État épidémiologique S'],
    ['infectiousCount', 'Agents dans l’état infectieux actif simulé', 'individus', 'État épidémiologique I'],
    ['removedCount', 'Agents rétablis ou retirés (Immunité acquise)', 'individus', 'État épidémiologique R (Modèle SIR)'],
    ['infectiousPercentage', 'Proportion de la population dans l’état infectieux', '%', '100 × (I / N_present)'],
    ['proximityContacts', 'Nombre de paires d’agents situées sous la distance seuil', 'paires / pas', 'd(i,j) <= d_seuil au pas courant'],
    ['uniquePairsInContact', 'Nombre cumulé de paires uniques ayant interagi', 'paires uniques', 'Ensemble des couples (i,j) distincts'],
    ['contactEpisodes', 'Nombre total d’événements continus de contact', 'épisodes', 'Durée cumulée continue D >= 1 min'],
    ['cumulativeContacts', 'Somme cumulée de toutes les proximités enregistrées', 'contacts', 'Somme temporelle des contacts instantanés'],
    ['newInfections', 'Nombre de nouvelles transitions S -> I au pas courant', 'individus', 'Tirage aléatoire conditionné par P'],
    ['temperature', 'Température de l’air ambiant', '°C', 'Données ENVI-met interpolées (9h, 13h, 18h)'],
    ['relativeHumidity', 'Humidité relative de l’air', '%', 'Données ENVI-met interpolées'],
    ['windSpeed', 'Vitesse du vent ambiant à 10m', 'm/s', 'Données ENVI-met interpolées'],
    ['visitorsPresent', 'Effectif des visiteurs extérieurs présents', 'individus', 'Injectés aux 4 portes d’accès'],
    ['p_base', 'Taux de risque de base de transmission par minute', 'min^-1', 'Hypothèse exploratoire non calibrée'],
    ['f_distance', 'Facteur de décroissance radiale du risque', 'sans unité [0,1]', '(1 - d / d_max)^1.5 pour d <= d_max'],
    ['f_vent', 'Facteur de dilution aérosol par le vent', 'sans unité [0,1]', '1 / (1 + 0.35 × v)'],
    ['f_vegetation', 'Facteur de filtration et ombrage végétal', 'sans unité [0,1]', '1 - 0.28 × densité_canopée'],
    ['lambda', 'Taux instantané de hasard de transmission', 'min^-1', 'p_base × f_dist × f_clim × f_vent × f_veg'],
    ['probability_P', 'Probabilité cumulative de transmission par épisode', 'sans unité [0,1]', '1 - exp(-lambda × durée)'],
    ['deltaContactsVsS0', 'Variation relative des contacts par rapport à S0', '%', '100 × (valeur - S0) / S0 (ou « non calculable »)'],
    ['pValueEstimate', 'Significativité statistique du test de Student apparié', 'p-value', 'Test t apparié sur 30 graines communes'],
  ];

  const ws5 = XLSX.utils.aoa_to_sheet(dictRows);
  XLSX.utils.book_append_sheet(wb, ws5, 'Dictionnaire_Variables');

  // ----------------------------------------------------
  // Sheet 6: Détail de chaque réplication individuelle (si présentes)
  // ----------------------------------------------------
  const hasRepDetails =
    allScenarioStats &&
    allScenarioStats.some((s) => s.replicationsDetails && s.replicationsDetails.length > 0);
  if (hasRepDetails) {
    const repHeaders = [
      'Scénario',
      'Nom Scénario',
      'Réplication N°',
      'Graine Mulberry32',
      'Contacts Cumulés Totaux',
      'Infectés Finaux (I)',
      '% Infectieux Final',
      'Pic Infectieux Max',
      'Taux d’Attaque (%)',
      'Épisodes de Contact Totaux',
    ];
    const repRows: any[][] = [repHeaders];
    for (const st of allScenarioStats!) {
      if (st.replicationsDetails) {
        for (const run of st.replicationsDetails) {
          repRows.push([
            st.scenarioId,
            st.scenarioName,
            run.repIndex,
            run.seed,
            run.finalContacts,
            run.finalInfected,
            run.finalInfectedPercent,
            run.peakInfected,
            run.attackRate,
            run.totalEpisodes,
          ]);
        }
      }
    }
    const wsRep = XLSX.utils.aoa_to_sheet(repRows);
    XLSX.utils.book_append_sheet(wb, wsRep, 'Replications_Detail');
  }

  return wb;
}

/**
 * Triggers browser download of the multi-sheet XLSX file.
 */
export function exportMultiSheetXLSX(
  activeResult: SimulationResult,
  allScenarioStats?: ScenarioReplicationStats[],
  allResultsOrFilename?: SimulationResult[] | string,
  sensitivityDataOrFilename?: SensitivityResult[] | string,
  optionalFilename?: string
): void {
  let allResults: SimulationResult[] | undefined;
  let sensitivityData: SensitivityResult[] | undefined;
  let filename: string | undefined;

  if (typeof allResultsOrFilename === 'string') {
    filename = allResultsOrFilename;
  } else {
    allResults = allResultsOrFilename;
  }

  if (typeof sensitivityDataOrFilename === 'string') {
    filename = sensitivityDataOrFilename;
  } else {
    sensitivityData = sensitivityDataOrFilename;
  }

  if (optionalFilename) {
    filename = optionalFilename;
  }

  const wb = buildMultiSheetWorkbook(activeResult, allScenarioStats, allResults, sensitivityData);
  XLSX.writeFile(wb, filename || `UrbanResilience_UV9_Complet_${Date.now()}.xlsx`);
}

/**
 * Generates raw CSV string content with all time steps (RFC 4180 with UTF-8 BOM).
 */
export function generateCSVContent(results: SimulationResult[]): string {
  const headers = [
    'experience_id',
    'scenario_id',
    'scenario_name',
    'replication',
    'graine_seed',
    'pas_minute',
    'heure_reelle',
    'population_presente',
    'susceptibles_S',
    'infectieux_I',
    'retires_R',
    'pourcentage_infectieux',
    'contacts_proximite_instantanes',
    'paires_uniques_contact',
    'episodes_contact_cumules',
    'contacts_cumules_total',
    'nouvelles_infections',
    'temperature_air_celsius',
    'humidite_relative_pct',
    'vitesse_vent_ms',
    'visiteurs_presents',
    'flux_RueA_pers_h',
    'flux_RueB_pers_h',
    'flux_RueC_pers_h',
    'flux_RueD_pers_h',
  ];

  const rows: string[] = [headers.join(',')];

  for (const res of results) {
    for (const m of res.metrics) {
      const row = [
        res.experimentId,
        res.scenarioId,
        `"${res.scenarioName.replace(/"/g, '""')}"`,
        res.replicationIndex,
        res.seed,
        m.step,
        m.clockTime,
        m.populationPresent,
        m.susceptibleCount,
        m.infectiousCount,
        m.removedCount,
        m.infectiousPercentage,
        m.proximityContacts,
        m.uniquePairsInContact,
        m.contactEpisodes,
        m.cumulativeContacts,
        m.newInfections,
        m.temperature,
        m.relativeHumidity,
        m.windSpeed,
        m.visitorsPresent,
        m.streetFlows.RueA,
        m.streetFlows.RueB,
        m.streetFlows.RueC,
        m.streetFlows.RueD,
      ];
      rows.push(row.join(','));
    }
  }

  return '\uFEFF' + rows.join('\r\n'); // UTF-8 BOM for Excel
}

/**
 * Generates CSV string for single simulation step metrics.
 */
export function generateSimulationCSV(metrics: StepMetric[], config: ScenarioConfig): string {
  const dummyResult: SimulationResult = {
    experimentId: `EXP_${config.id}_${config.seed}`,
    scenarioId: config.id,
    scenarioName: config.name,
    replicationIndex: 1,
    seed: config.seed,
    totalSteps: metrics.length,
    metrics,
    finalMetrics: {
      totalContacts: metrics[metrics.length - 1]?.cumulativeContacts || 0,
      peakInfectious: Math.max(...metrics.map((m) => m.infectiousCount), 0),
      finalInfectious: metrics[metrics.length - 1]?.infectiousCount || 0,
      finalInfectiousPercentage: metrics[metrics.length - 1]?.infectiousPercentage || 0,
      attackRate: ((metrics[metrics.length - 1]?.infectiousCount || 0) / config.initialPopulation) * 100,
      totalEpisodes: metrics[metrics.length - 1]?.contactEpisodes || 0,
      avgContactsPerAgent: (metrics[metrics.length - 1]?.cumulativeContacts || 0) / config.initialPopulation,
    },
    configSnapshot: config,
    completedAt: new Date().toISOString(),
  };
  return generateCSVContent([dummyResult]);
}

/**
 * Exports scenario replication summary statistics to multi-sheet Excel file.
 */
export function exportScenarioSummaryToExcel(stats: ScenarioReplicationStats[]): void {
  const dummyResult: SimulationResult = {
    experimentId: 'SUMMARY_EXPORT',
    scenarioId: 'S0',
    scenarioName: 'Synthèse Réplications',
    replicationIndex: 1,
    seed: 12345,
    totalSteps: 540,
    metrics: [],
    finalMetrics: {
      totalContacts: 0,
      peakInfectious: 0,
      finalInfectious: 0,
      finalInfectiousPercentage: 0,
      attackRate: 0,
      totalEpisodes: 0,
      avgContactsPerAgent: 0,
    },
    configSnapshot: SCENARIO_PRESETS.S0,
    completedAt: new Date().toISOString(),
  };

  const wb = buildMultiSheetWorkbook(dummyResult, stats);
  XLSX.writeFile(wb, `UrbanResilience_SimLab_Scenarios_Summary_${Date.now()}.xlsx`);
}

/**
 * Generates and triggers download of CSV file with all time steps.
 */
export function exportResultsToCSV(results: SimulationResult[], filename?: string): void {
  const csvContent = generateCSVContent(results);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `UrbanResilience_SimLab_Export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds and returns the JSON payload for reproducibility.
 */
export function buildReproducibilityJSONPayload(
  results: SimulationResult | SimulationResult[],
  scenarioStats?: ScenarioReplicationStats[]
): object {
  const resultsArray = Array.isArray(results) ? results : [results];

  return {
    metadata: {
      tool: 'UrbanResilience SimLab',
      version: SIMULATION_ENGINE_VERSION,
      exportedAt: new Date().toISOString(),
      terrain: 'Unité de Voisinage 9 (UV9), Ville Nouvelle Ali Mendjeli, Constantine, Algérie',
      spatialDimensionsMeters: { width: 500, height: 400 },
      timeRange: { startHour: 9, endHour: 18, totalSteps: 540, stepDurationMinutes: 1 },
      scientificDisclaimer: 'Modèle exploratoire — Hypothèse illustrative non calibrée sur données cliniques réelles d’infection.',
      prngEngine: 'Mulberry32 PRNG (Deterministic 32-bit state)',
    },
    scenariosConfigured: SCENARIO_PRESETS,
    scenarioSummaryStatistics: scenarioStats || [],
    simulationRunsCount: resultsArray.length,
    simulationRuns: resultsArray.map((r) => ({
      experimentId: r.experimentId,
      scenarioId: r.scenarioId,
      scenarioName: r.scenarioName,
      replicationIndex: r.replicationIndex,
      seed: r.seed,
      totalSteps: r.totalSteps,
      finalMetrics: r.finalMetrics,
      configSnapshot: r.configSnapshot,
      metrics: r.metrics,
      completedAt: r.completedAt,
    })),
  };
}

/**
 * Generates formatted JSON string.
 */
export function generateJSONString(
  results: SimulationResult | SimulationResult[],
  scenarioStats?: ScenarioReplicationStats[]
): string {
  const payload = buildReproducibilityJSONPayload(results, scenarioStats);
  return JSON.stringify(payload, null, 2);
}

/**
 * Exports full JSON reproducibility bundle.
 */
export function exportResultsToJSON(
  results: SimulationResult | SimulationResult[],
  scenarioStats?: ScenarioReplicationStats[],
  filename?: string
): void {
  const jsonStr = generateJSONString(results, scenarioStats);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `UrbanResilience_UV9_Bundle_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Writes workbook to array buffer for programmatic inspection and verification.
 */
export function buildMultiSheetWorkbookBuffer(wb: XLSX.WorkBook): Uint8Array {
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

/**
 * Executes a full 5-scenario benchmark study (S0 to S4),
 * either with 1 baseline run per scenario (5 runs total, fast ~150ms)
 * or N replications per scenario (e.g. 30 replications = 150 runs total).
 */
export function runFullBenchmarkStudy(
  replicationsPerScenario: number = 1,
  baseSeed: number = 42,
  onProgress?: (completed: number, total: number) => void
): {
  results: SimulationResult[];
  stats: ScenarioReplicationStats[];
} {
  const scenarioIds: ScenarioId[] = ['S0', 'S1', 'S2', 'S3', 'S4'];
  const allResults: SimulationResult[] = [];
  const allStats: ScenarioReplicationStats[] = [];
  const totalRuns = scenarioIds.length * replicationsPerScenario;
  let runsCompleted = 0;

  for (const id of scenarioIds) {
    const cfg = SCENARIO_PRESETS[id];
    if (replicationsPerScenario === 1) {
      const instance = new SimulationInstance({ ...cfg, seed: baseSeed }, 1);
      const res = instance.runToCompletion();
      allResults.push(res);
      runsCompleted++;
      if (onProgress) onProgress(runsCompleted, totalRuns);

      allStats.push({
        scenarioId: id,
        scenarioName: cfg.name,
        replicationCount: 1,
        seeds: [baseSeed],
        meanFinalContacts: res.finalMetrics.totalContacts,
        sdFinalContacts: 0,
        seFinalContacts: 0,
        medianFinalContacts: res.finalMetrics.totalContacts,
        iqrFinalContacts: 0,
        minFinalContacts: res.finalMetrics.totalContacts,
        maxFinalContacts: res.finalMetrics.totalContacts,
        ci95FinalContacts: [res.finalMetrics.totalContacts, res.finalMetrics.totalContacts],
        meanFinalInfected: res.finalMetrics.finalInfectious,
        sdFinalInfected: 0,
        seFinalInfected: 0,
        medianFinalInfected: res.finalMetrics.finalInfectious,
        iqrFinalInfected: 0,
        minFinalInfected: res.finalMetrics.finalInfectious,
        maxFinalInfected: res.finalMetrics.finalInfectious,
        ci95FinalInfected: [res.finalMetrics.finalInfectious, res.finalMetrics.finalInfectious],
        meanInfectedPercent: res.finalMetrics.finalInfectiousPercentage,
        sdInfectedPercent: 0,
        meanAttackRate: res.finalMetrics.attackRate,
        sdAttackRate: 0,
        deltaContactsVsS0Percent: null,
        deltaInfectedVsS0Percent: null,
        replicationsDetails: [
          {
            repIndex: 1,
            seed: baseSeed,
            finalContacts: res.finalMetrics.totalContacts,
            finalInfected: res.finalMetrics.finalInfectious,
            finalInfectedPercent: res.finalMetrics.finalInfectiousPercentage,
            peakInfected: res.finalMetrics.peakInfectious,
            attackRate: res.finalMetrics.attackRate,
            totalEpisodes: res.finalMetrics.totalEpisodes,
          },
        ],
        timeSeriesMean: {
          minutes: [0, 540],
          contactsMean: [0, res.finalMetrics.totalContacts],
          contactsSd: [0, 0],
          contactsSe: [0, 0],
          contactsCi95Lower: [0, res.finalMetrics.totalContacts],
          contactsCi95Upper: [0, res.finalMetrics.totalContacts],
          infectedMean: [res.metrics[0]?.infectiousCount || 4, res.finalMetrics.finalInfectious],
          infectedSd: [0, 0],
          infectedSe: [0, 0],
          infectedCi95Lower: [res.metrics[0]?.infectiousCount || 4, res.finalMetrics.finalInfectious],
          infectedCi95Upper: [res.metrics[0]?.infectiousCount || 4, res.finalMetrics.finalInfectious],
          individualTraces: [
            {
              repIndex: 1,
              seed: baseSeed,
              contacts: [0, res.finalMetrics.totalContacts],
              infected: [res.metrics[0]?.infectiousCount || 4, res.finalMetrics.finalInfectious],
            },
          ],
        },
      });
    } else {
      const { results, stats } = runScenarioReplications(
        cfg,
        replicationsPerScenario,
        baseSeed,
        () => {
          runsCompleted++;
          if (onProgress) onProgress(runsCompleted, totalRuns);
        }
      );
      allResults.push(...results);
      allStats.push(stats);
    }
  }

  // Compute paired deltas vs S0
  const statsWithDeltas = computePairedComparison(allStats, 'S0');
  return { results: allResults, stats: statsWithDeltas };
}

export interface ExportVerificationReport {
  passed: boolean;
  xlsx: {
    canOpen: boolean;
    sheetNames: string[];
    expectedSheetsPresent: boolean;
    totalRowsSheet2: number;
    totalRowsSheet3: number;
    metricsMatchFinalTotals: boolean;
  };
  csv: {
    canParse: boolean;
    columnCount: number;
    expectedColumnsPresent: boolean;
    totalRows: number;
    contactsSumMatchesFinalTotal: boolean;
  };
  json: {
    canParse: boolean;
    hasMetadata: boolean;
    runsCount: number;
    hasAllScenarios: boolean;
    metricsIntegrity: boolean;
  };
  discrepancies: string[];
}

/**
 * Formally verifies that XLSX, CSV, and JSON exports can be opened and parsed,
 * and that internal totals match displayed final results with 100% precision.
 */
export function verifyExportIntegrity(
  results: SimulationResult[],
  stats: ScenarioReplicationStats[]
): ExportVerificationReport {
  const discrepancies: string[] = [];

  // --- 1. XLSX Verification ---
  let xlsxCanOpen = false;
  let xlsxSheetNames: string[] = [];
  let xlsxExpectedSheetsPresent = false;
  let xlsxRowsSheet2 = 0;
  let xlsxRowsSheet3 = 0;
  let xlsxTotalsMatch = true;

  try {
    const wb = buildMultiSheetWorkbook(results[0], stats, results);
    const buf = buildMultiSheetWorkbookBuffer(wb);
    const readWb = XLSX.read(buf, { type: 'array' });
    xlsxCanOpen = true;
    xlsxSheetNames = readWb.SheetNames;

    const expectedSheets = [
      'Parametres_Hypotheses',
      'Resultats_Temporels',
      'Stats_Scenarios',
      'Sensibilite',
      'Dictionnaire_Variables',
    ];
    xlsxExpectedSheetsPresent = expectedSheets.every((name) => xlsxSheetNames.includes(name));
    if (!xlsxExpectedSheetsPresent) {
      discrepancies.push(`Feuilles XLSX manquantes : attendu [${expectedSheets.join(', ')}], obtenu [${xlsxSheetNames.join(', ')}]`);
    }

    // Inspect Sheet 2 (Resultats_Temporels)
    const ws2 = readWb.Sheets['Resultats_Temporels'];
    const rows2: any[][] = XLSX.utils.sheet_to_json(ws2, { header: 1 });
    xlsxRowsSheet2 = rows2.length;

    // Check sum of instant contacts per run in Sheet 2
    // Row 0 is header.
    // Column indices: 0: Scenario, 1: Rep, 10: Contacts Instantanés, 13: Contacts Cumulés Total
    const headerRow = rows2[0] as string[];
    const instantContactsColIdx = headerRow.indexOf('Contacts Instantanés');
    const cumContactsColIdx = headerRow.indexOf('Contacts Cumulés Total');
    const scenarioColIdx = headerRow.indexOf('Scénario');
    const repColIdx = headerRow.indexOf('Réplication');

    // Group rows by scenario and replication
    const runStepGroups = new Map<string, { sumInstant: number; finalCum: number }>();
    for (let i = 1; i < rows2.length; i++) {
      const row = rows2[i];
      if (!row || row.length === 0) continue;
      const key = `${row[scenarioColIdx]}_${row[repColIdx]}`;
      if (!runStepGroups.has(key)) {
        runStepGroups.set(key, { sumInstant: 0, finalCum: 0 });
      }
      const entry = runStepGroups.get(key)!;
      entry.sumInstant += Number(row[instantContactsColIdx]) || 0;
      entry.finalCum = Number(row[cumContactsColIdx]) || 0;
    }

    for (const [key, val] of runStepGroups.entries()) {
      if (val.sumInstant !== val.finalCum) {
        xlsxTotalsMatch = false;
        discrepancies.push(`XLSX Sheet 2 Totaux incompatibles pour ${key}: somme instantanée = ${val.sumInstant}, cumul final = ${val.finalCum}`);
      }
    }

    // Inspect Sheet 3 (Stats_Scenarios)
    const ws3 = readWb.Sheets['Stats_Scenarios'];
    const rows3: any[][] = XLSX.utils.sheet_to_json(ws3, { header: 1 });
    xlsxRowsSheet3 = rows3.length;
  } catch (err: any) {
    xlsxCanOpen = false;
    discrepancies.push(`Erreur lors de la lecture du classeur XLSX: ${err.message}`);
  }

  // --- 2. CSV Verification ---
  let csvCanParse = false;
  let csvColumnCount = 0;
  let csvExpectedColumnsPresent = false;
  let csvTotalRows = 0;
  let csvTotalsMatch = true;

  try {
    const csvStr = generateCSVContent(results);
    const lines = csvStr.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    csvTotalRows = lines.length;
    csvCanParse = lines.length > 1;

    const headers = lines[0].split(',');
    csvColumnCount = headers.length;
    csvExpectedColumnsPresent =
      csvColumnCount === 25 &&
      headers.includes('contacts_proximite_instantanes') &&
      headers.includes('contacts_cumules_total') &&
      headers.includes('flux_RueD_pers_h');

    const csvInstantIdx = headers.indexOf('contacts_proximite_instantanes');
    const csvCumIdx = headers.indexOf('contacts_cumules_total');
    const csvScenIdx = headers.indexOf('scenario_id');
    const csvRepIdx = headers.indexOf('replication');

    const csvGroups = new Map<string, { sumInstant: number; finalCum: number }>();
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const key = `${parts[csvScenIdx]}_${parts[csvRepIdx]}`;
      if (!csvGroups.has(key)) {
        csvGroups.set(key, { sumInstant: 0, finalCum: 0 });
      }
      const g = csvGroups.get(key)!;
      g.sumInstant += parseInt(parts[csvInstantIdx], 10) || 0;
      g.finalCum = parseInt(parts[csvCumIdx], 10) || 0;
    }

    for (const [key, val] of csvGroups.entries()) {
      if (val.sumInstant !== val.finalCum) {
        csvTotalsMatch = false;
        discrepancies.push(`CSV Totaux incompatibles pour ${key}: somme instantanée = ${val.sumInstant}, cumul final = ${val.finalCum}`);
      }
    }
  } catch (err: any) {
    csvCanParse = false;
    discrepancies.push(`Erreur parsing CSV: ${err.message}`);
  }

  // --- 3. JSON Verification ---
  let jsonCanParse = false;
  let jsonHasMetadata = false;
  let jsonRunsCount = 0;
  let jsonHasAllScenarios = false;
  let jsonMetricsIntegrity = true;

  try {
    const jsonStr = generateJSONString(results, stats);
    const parsed: any = JSON.parse(jsonStr);
    jsonCanParse = true;

    jsonHasMetadata =
      parsed.metadata &&
      parsed.metadata.tool === 'UrbanResilience SimLab' &&
      typeof parsed.metadata.scientificDisclaimer === 'string';

    jsonRunsCount = parsed.simulationRunsCount || (parsed.simulationRuns ? parsed.simulationRuns.length : 0);

    const scenarioIdsFound = new Set<string>();
    if (parsed.simulationRuns) {
      for (const run of parsed.simulationRuns) {
        scenarioIdsFound.add(run.scenarioId);
        // Verify total contacts in finalMetrics matches metrics sum
        let sumInst = 0;
        for (const m of run.metrics) {
          sumInst += m.proximityContacts;
        }
        if (sumInst !== run.finalMetrics.totalContacts) {
          jsonMetricsIntegrity = false;
          discrepancies.push(`JSON run ${run.scenarioId} (rep ${run.replicationIndex}) somme instantanée (${sumInst}) != finalMetrics.totalContacts (${run.finalMetrics.totalContacts})`);
        }
      }
    }
    jsonHasAllScenarios = ['S0', 'S1', 'S2', 'S3', 'S4'].every((id) => scenarioIdsFound.has(id));
  } catch (err: any) {
    jsonCanParse = false;
    discrepancies.push(`Erreur parsing JSON: ${err.message}`);
  }

  const passed =
    xlsxCanOpen &&
    xlsxExpectedSheetsPresent &&
    xlsxTotalsMatch &&
    csvCanParse &&
    csvExpectedColumnsPresent &&
    csvTotalsMatch &&
    jsonCanParse &&
    jsonHasMetadata &&
    jsonMetricsIntegrity &&
    discrepancies.length === 0;

  return {
    passed,
    xlsx: {
      canOpen: xlsxCanOpen,
      sheetNames: xlsxSheetNames,
      expectedSheetsPresent: xlsxExpectedSheetsPresent,
      totalRowsSheet2: xlsxRowsSheet2,
      totalRowsSheet3: xlsxRowsSheet3,
      metricsMatchFinalTotals: xlsxTotalsMatch,
    },
    csv: {
      canParse: csvCanParse,
      columnCount: csvColumnCount,
      expectedColumnsPresent: csvExpectedColumnsPresent,
      totalRows: csvTotalRows,
      contactsSumMatchesFinalTotal: csvTotalsMatch,
    },
    json: {
      canParse: jsonCanParse,
      hasMetadata: jsonHasMetadata,
      runsCount: jsonRunsCount,
      hasAllScenarios: jsonHasAllScenarios,
      metricsIntegrity: jsonMetricsIntegrity,
    },
    discrepancies,
  };
}

/**
 * Validates and parses imported CSV text for ENVI-met climate observations
 */
export function parseAndValidateClimateCSV(csvText: string): {
  success: boolean;
  data?: HourlyClimateData[];
  errors: string[];
  warnings: string[];
  previewRows: any[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { success: false, errors: ['Le fichier CSV est vide ou ne comporte pas d’en-tête.'], warnings, previewRows: [] };
  }

  const header = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim().replace(/['"]/g, ''));
  const hourIdx = header.findIndex((h) => h.includes('hour') || h.includes('heure'));
  const tempIdx = header.findIndex((h) => h.includes('temp') || h.includes('temperature'));
  const rhIdx = header.findIndex((h) => h.includes('humid') || h.includes('rh'));
  const windIdx = header.findIndex((h) => h.includes('wind') || h.includes('vent') || h.includes('vitesse'));

  if (hourIdx === -1 || tempIdx === -1) {
    errors.push('Colonnes requises manquantes : "heure" et "temperature" doivent être présentes dans le CSV.');
    return { success: false, errors, warnings, previewRows: [] };
  }

  const parsedData: HourlyClimateData[] = [];
  const previewRows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/).map((p) => p.trim().replace(/['"]/g, ''));
    if (parts.length <= Math.max(hourIdx, tempIdx)) continue;

    const rawHour = parts[hourIdx];
    const rawTemp = parts[tempIdx];
    const rawRh = rhIdx !== -1 ? parts[rhIdx] : '50';
    const rawWind = windIdx !== -1 ? parts[windIdx] : '2.0';

    const hour = parseFloat(rawHour.includes(':') ? rawHour.split(':')[0] : rawHour);
    const temp = parseFloat(rawTemp);
    const rh = parseFloat(rawRh);
    const wind = parseFloat(rawWind);

    if (isNaN(hour) || hour < 0 || hour > 24) {
      warnings.push(`Ligne ${i + 1} : Heure invalide (${rawHour}). Ligne ignorée.`);
      continue;
    }
    if (isNaN(temp) || temp < -15 || temp > 55) {
      warnings.push(`Ligne ${i + 1} : Température hors plage réaliste (${rawTemp}°C).`);
      continue;
    }

    const obs: HourlyClimateData = {
      hour,
      temperatureC: Number(temp.toFixed(2)),
      relativeHumidityPercent: isNaN(rh) ? 45 : Math.max(0, Math.min(100, Number(rh.toFixed(1)))),
      windSpeedMs: isNaN(wind) ? 2.0 : Math.max(0, Number(wind.toFixed(2))),
      source: 'Importé',
    };

    parsedData.push(obs);
    previewRows.push(obs);
  }

  if (parsedData.length === 0) {
    errors.push('Aucune donnée valide n’a pu être extraite du fichier CSV.');
    return { success: false, errors, warnings, previewRows: [] };
  }

  return {
    success: true,
    data: parsedData,
    errors,
    warnings,
    previewRows: previewRows.slice(0, 10),
  };
}
