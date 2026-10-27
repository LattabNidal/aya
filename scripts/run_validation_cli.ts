/**
 * CLI runner to execute all 16 scientific validation tests and report real measurements.
 */
import { runFullValidationSuite } from '../src/engine/validationSuite';

console.log('================================================================');
console.log('🔬 AUDIT SCIENTIFIQUE COMPLET DES 16 TESTS D’INVARIANTS (SIMLAB)');
console.log('================================================================\n');

const t0 = performance.now();
const results = runFullValidationSuite();
const totalTime = (performance.now() - t0).toFixed(1);

let allPass = true;
results.forEach((t) => {
  if (!t.passed) allPass = false;
  console.log(`[Test ${t.id < 10 ? '0' + t.id : t.id}] ${t.passed ? '✅ PASS' : '❌ FAIL'} (${t.executionTimeMs} ms) : ${t.title}`);
  console.log(`   Hypothèse : ${t.hypothesis}`);
  console.log(`   Mesure : ${t.details}`);
  console.log('----------------------------------------------------------------');
});

console.log(`\nBILAN GLOBAL : ${allPass ? '✅ 16/16 TESTS VALIDÉS' : '❌ CERTAINS TESTS ONT ÉCHOUÉ'} en ${totalTime} ms au total.`);
