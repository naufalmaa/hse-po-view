// npm run preflight  (atau ENV_FILE=.env.demo npm run preflight)
// Menjalankan pemeriksaan yang sama dengan saat server start, tanpa mengubah skema.
// Keluar 0 = siap, 1 = ada pemeriksaan wajib yang gagal.
import { hasFatal, printResults, runPreflightAfterSchema, runPreflightBeforeSchema } from '../preflight.ts';

const before = await runPreflightBeforeSchema();
printResults('backend', before);
let results = before;
// Ekstensi dan csms-ai hanya berarti bila DB terjangkau.
if (before.find((r) => r.name === 'Database')?.ok) {
  const after = await runPreflightAfterSchema();
  printResults('backend (dependensi)', after);
  results = [...before, ...after];
}
const fatal = hasFatal(results);
console.log(fatal ? '[preflight] GAGAL: perbaiki baris FAIL di atas.' : '[preflight] SIAP.');
process.exit(fatal ? 1 : 0);
