import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { app } from './server.js';

describe('API shell', () => {
  it('GET /health returns ok', async () => {
    const response = await request(app).get('/health').expect(200);

    assert.equal(response.body.ok, true);
    assert.equal(response.body.service, 'Ably Fantasy World Cup');
  });

  it('GET /api/config returns config object', async () => {
    const response = await request(app).get('/api/config').expect(200);

    assert.equal(response.body.ok, true);
    assert.equal(response.body.service, 'Ably Fantasy World Cup');
    assert.equal(typeof response.body.environment, 'string');
    assert.equal(typeof response.body.hasDatabase, 'boolean');
  });
});
