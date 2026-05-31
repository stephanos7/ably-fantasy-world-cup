import assert from 'node:assert/strict';
import { APP_NAME } from '../src/index.js';

assert.equal(APP_NAME, 'Ably Fantasy World Cup');
console.log('Shared placeholder test passed.');
