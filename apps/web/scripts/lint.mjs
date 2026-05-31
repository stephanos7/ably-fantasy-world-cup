import { existsSync } from 'node:fs';

const required = ['index.html', 'src/main.jsx', 'src/App.jsx', 'vite.config.js'];
const missing = required.filter((path) => !existsSync(new URL(`../${path}`, import.meta.url)));

if (missing.length > 0) {
  console.error(`Web skeleton is missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Web lint placeholder passed.');
