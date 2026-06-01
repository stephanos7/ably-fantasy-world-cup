import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertRuntimeEnv } from "./http/config.js";
import { handler as healthHandler } from "../../netlify/functions/health.js";
import { handler as configHandler } from "../../netlify/functions/config.js";
import { handler as ablyTokenHandler } from "../../netlify/functions/ably-token.js";

async function invoke(handler, { method = "GET", body } = {}) {
  const response = await handler({
    httpMethod: method,
    body: body === undefined ? null : JSON.stringify(body),
    isBase64Encoded: false,
    queryStringParameters: {},
    path: "/"
  });

  return {
    ...response,
    json: JSON.parse(response.body)
  };
}

describe("Netlify function shell", () => {
  it("GET /health returns ok", async () => {
    const response = await invoke(healthHandler);

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.ok, true);
    assert.equal(response.json.service, "Ably Fantasy World Cup");
    assert.equal(response.json.livesyncMode, "required");
  });

  it("GET /api/config returns config object", async () => {
    const response = await invoke(configHandler);

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.ok, true);
    assert.equal(response.json.service, "Ably Fantasy World Cup");
    assert.equal(typeof response.json.environment, "string");
    assert.equal(typeof response.json.database.configured, "boolean");
    assert.equal(typeof response.json.ably.configured, "boolean");
    assert.equal(response.json.livesync.mode, "required");
  });

  it("GET /api/config reports configured env when root env is loaded", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousApiKey = process.env.ABLY_API_KEY;
    process.env.DATABASE_URL =
      "postgresql://user:password@example.com/db?sslmode=require";
    process.env.ABLY_API_KEY = "app.key:secret";

    try {
      const response = await invoke(configHandler);

      assert.equal(response.statusCode, 200);
      assert.equal(response.json.database.configured, true);
      assert.equal(response.json.database.target.host, "example.com");
      assert.equal(response.json.ably.configured, true);
      assert.equal(JSON.stringify(response.json).includes("app.key:secret"), false);
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }

      if (previousApiKey === undefined) {
        delete process.env.ABLY_API_KEY;
      } else {
        process.env.ABLY_API_KEY = previousApiKey;
      }
    }
  });

  it("GET /api/ably/token returns 503 when Ably auth is not configured", async () => {
    const previousApiKey = process.env.ABLY_API_KEY;
    delete process.env.ABLY_API_KEY;

    try {
      const response = await invoke(ablyTokenHandler);

      assert.equal(response.statusCode, 503);
      assert.equal(response.json.ok, false);
      assert.match(response.json.error, /Ably token auth is not configured/);
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
      const response = await invoke(ablyTokenHandler);
      const capability = JSON.parse(response.json.capability);

      assert.equal(response.statusCode, 200);
      assert.equal(response.json.keyName, "app.key");
      assert.equal(typeof response.json.mac, "string");
      assert.equal(response.json.ttl, 60 * 60 * 1000);
      assert.deepEqual(capability["league:*"], ["subscribe"]);
      assert.deepEqual(capability["match:*"], ["subscribe"]);
      assert.equal(capability["team:*"], undefined);
      assert.equal(JSON.stringify(response.json).includes("app.key:secret"), false);
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
