/**
 * Verification Script for UrbanResilience SimLab Exports:
 * XLSX (5 planned sheets + replications), CSV (25 columns, 540 steps), JSON (full reproducibility).
 * Executes real simulations, verifies files can be opened and parsed,
 * and confirms that all internal totals exactly match the displayed metrics.
 */

import * as XLSX from 'xlsx';
import {
  buildMultiSheetWorkbook,
  buildMultiSheetWorkbookBuffer,
  generateCSVContent,
  generateJSONString,
  runFullBenchmarkStudy,
  verifyExportIntegrity,
} from '../src/engine/exportImport';

async function runExportAudit() {
  console.log('================================================================');
  console.log('🔬 AUDIT SCIENTIFIQUE DES EXPORTS : URBANRESILIENCE SIMLAB (UV9)');
  console.log('================================================================\n');

  console.log('1. Exécution réelle des 5 scénarios d’aménagement (S0, S1, S2, S3, S4)...');
  const t0 = performance.now();
  const { results: studyResults, stats: studyStats } = runFullBenchmarkStudy(1, 42);
  const duration = (performance.now() - t0).toFixed(1);
  console.log(`   -> 5 scénarios exécutés avec succès en ${duration} ms (5 × 540 pas = 2 700 minutes réelles).`);

  console.log('\n2. Audit formel via verifyExportIntegrity()...');
  const report = verifyExportIntegrity(studyResults, studyStats);
  console.log(`   -> Statut global : ${report.passed ? '✅ PASS (100% Conforme)' : '❌ FAIL'}`);

  console.log('\n3. Détail de la structure du classeur Excel (.XLSX) :');
  console.log(`   - Ouverture binaire réussie : ${report.xlsx.canOpen ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - 5 feuilles prévues présentes : ${report.xlsx.expectedSheetsPresent ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Feuilles détectées : [ ${report.xlsx.sheetNames.join(', ')} ]`);
  console.log(`   - Lignes dans Resultats_Temporels : ${report.xlsx.totalRowsSheet2} lignes`);
  console.log(`   - Lignes dans Stats_Scenarios : ${report.xlsx.totalRowsSheet3} lignes (en-tête + 5 scénarios)`);
  console.log(`   - Exactitude des totaux de contacts : ${report.xlsx.metricsMatchFinalTotals ? '✅ 100% EXACT (Somme = Cumul)' : '❌ ÉCART'}`);

  console.log('\n4. Détail du fichier Séries Temporelles (.CSV) :');
  console.log(`   - Parsing réussi : ${report.csv.canParse ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Nombre de colonnes : ${report.csv.columnCount}/25 colonnes requises`);
  console.log(`   - 25 colonnes obligatoires présentes : ${report.csv.expectedColumnsPresent ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Lignes de données enregistrées : ${report.csv.totalRows - 1} pas de temps`);
  console.log(`   - Somme instantanée = Cumul final : ${report.csv.contactsSumMatchesFinalTotal ? '✅ 100% EXACT' : '❌ ÉCART'}`);

  console.log('\n5. Détail du paquet de reproductibilité (.JSON) :');
  console.log(`   - Validation syntaxique et parsing : ${report.json.canParse ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Métadonnées complètes (UV9, version, disclaimer) : ${report.json.hasMetadata ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Nombre d’exécutions sérialisées : ${report.json.runsCount}`);
  console.log(`   - 5 scénarios configurés (S0 à S4) : ${report.json.hasAllScenarios ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Intégrité des métriques pas-à-pas : ${report.json.metricsIntegrity ? '✅ OUI' : '❌ NON'}`);

  console.log('\n6. Matrice des résultats réels calculés et vérifiés dans les exports :');
  console.table(
    studyStats.map((st) => ({
      Scenario: st.scenarioId,
      Nom: st.scenarioName,
      Contacts_Cumules: st.meanFinalContacts,
      Infectes_Finaux: st.meanFinalInfected,
      Taux_Attaque_Pct: `${st.meanAttackRate}%`,
      Delta_Contacts_vs_S0: st.deltaContactsVsS0Percent === null ? 'Réf (0%)' : `${st.deltaContactsVsS0Percent}%`,
    }))
  );

  console.log('\n7. Test avec réplications multiples (S0 vs S4 apparié)...');
  const tRep0 = performance.now();
  const { results: repResults, stats: repStats } = runFullBenchmarkStudy(5, 42);
  const repDuration = (performance.now() - tRep0).toFixed(1);
  const repReport = verifyExportIntegrity(repResults, repStats);
  console.log(`   -> 5 scénarios × 5 réplications = 25 runs exécutés en ${repDuration} ms.`);
  console.log(`   -> Intégrité multi-réplications : ${repReport.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   -> Lignes Sheet 2 (Resultats_Temporels) : ${repReport.xlsx.totalRowsSheet2} lignes.`);

  if (report.discrepancies.length > 0 || repReport.discrepancies.length > 0) {
    console.error('❌ ÉCARTS DÉTECTÉS :', [...report.discrepancies, ...repReport.discrepancies]);
    process.exit(1);
  } else {
    console.log('\n✨ TOUS LES FICHIERS (XLSX, CSV, JSON) SONT 100% VALIDES ET CONCORDANTS !');
  }
}

runExportAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
