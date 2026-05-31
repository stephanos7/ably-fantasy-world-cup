import { existsSync } from 'node:fs';

if (!existsSync(new URL('../src/index.js', import.meta.url))) {
  console.error('Shared package is missing src/index.js.');
  process.exit(1);
}

console.log('Shared lint placeholder passed.');
