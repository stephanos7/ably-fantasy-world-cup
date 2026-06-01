import { existsSync } from 'node:fs';

const required = ['src/http/simulator.js', 'src/scoring/process-match-event.js'];
const missing = required.filter((path) => !existsSync(new URL(`../${path}`, import.meta.url)));

if (missing.length > 0) {
  console.error(`API backend modules are missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('API lint placeholder passed.');
