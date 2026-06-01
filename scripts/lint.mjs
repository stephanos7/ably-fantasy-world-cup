import { existsSync, readFileSync } from 'node:fs';

const requiredPaths = [
  'apps/web/index.html',
  'backend/src/http/simulator.js',
  'packages/shared/src/index.js',
  'db/migrations',
  'docs/architecture.md',
  '.env.example',
  'netlify.toml'
];

const missing = requiredPaths.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error(`Missing required skeleton paths:\n${missing.map((path) => `- ${path}`).join('\n')}`);
  process.exit(1);
}

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));

if (!rootPackage.scripts?.lint || !rootPackage.scripts?.test) {
  console.error('Root package.json must expose lint and test scripts.');
  process.exit(1);
}

console.log('Skeleton lint checks passed.');
