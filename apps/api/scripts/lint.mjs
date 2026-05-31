import { existsSync } from 'node:fs';

const required = ['src/server.js', 'package.json'];
const missing = required.filter((path) => !existsSync(new URL(`../${path}`, import.meta.url)));

if (missing.length > 0) {
  console.error(`API skeleton is missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('API lint placeholder passed.');
