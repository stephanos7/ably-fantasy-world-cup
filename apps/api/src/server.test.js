import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { app, assertRuntimeEnv } from "./server.js";

describe("API shell", () => {
  it("GET /health returns ok", async () => {
    const response = await request(app).get("/health").expect(200);

    assert.equal(response.body.ok, true);
    assert.equal(response.body.service, "Ably Fantasy World Cup");
    assert.equal(response.body.livesyncMode, "required");
  });

  it("GET /api/config returns config object", async () => {
    const response = await request(app).get("/api/config").expect(200);

    assert.equal(response.body.ok, true);
    assert.equal(response.body.service, "Ably Fantasy World Cup");
    assert.equal(typeof response.body.environment, "string");
    assert.equal(typeof response.body.database.configured, "boolean");
    assert.equal(typeof response.body.ably.configured, "boolean");
    assert.equal(response.body.livesync.mode, "required");
  });

  it("GET /api/ably/token returns 503 when Ably auth is not configured", async () => {
    const previousApiKey = process.env.ABLY_API_KEY;
    delete process.env.ABLY_API_KEY;

    try {
      const response = await request(app).get("/api/ably/token").expect(503);

      assert.equal(response.body.ok, false);
      assert.match(response.body.error, /Ably token auth is not configured/);
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.ABLY_API_KEY;
      } else {
        process.env.ABLY_API_KEY = previousApiKey;
      }
    }
  });

  it("GET /api/ably/token returns a browser-safe Ably TokenRequest", async () => {
    const previousApiKey = process.env.ABLY_API_KEY;
    process.env.ABLY_API_KEY = "app.key:secret";

    try {
      const response = await request(app).get("/api/ably/token").expect(200);
      const capability = JSON.parse(response.body.capability);

      assert.equal(response.body.keyName, "app.key");
      assert.equal(typeof response.body.mac, "string");
      assert.equal(response.body.ttl, 60 * 60 * 1000);
      assert.deepEqual(capability["league:*"], ["subscribe"]);
      assert.deepEqual(capability["match:*"], ["subscribe"]);
      assert.equal(capability["team:*"], undefined);
      assert.equal(JSON.stringify(response.body).includes("app.key:secret"), false);
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.ABLY_API_KEY;
      } else {
        process.env.ABLY_API_KEY = previousApiKey;
      }
    }
  });

  it("fails fast outside tests when DATABASE_URL is missing", async () => {
    assert.throws(
      () => assertRuntimeEnv({ ABLY_API_KEY: "app.key:secret" }),
      /DATABASE_URL required/
    );
  });

  it("fails fast outside tests when ABLY_API_KEY is missing", async () => {
    assert.throws(
      () =>
        assertRuntimeEnv({
          DATABASE_URL: "postgresql://user:password@example.com/db?sslmode=require"
        }),
      /ABLY_API_KEY required/
    );
  });
});
