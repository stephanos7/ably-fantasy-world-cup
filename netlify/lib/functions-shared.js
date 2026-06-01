import { createDatabasePool } from "../../apps/api/src/db/pool.js";

let pool;

export function getDatabase() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = createDatabasePool({ databaseUrl: process.env.DATABASE_URL });
  }

  return pool;
}

export function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function methodNotAllowed(allowedMethods) {
  return jsonResponse(
    405,
    { ok: false, error: "Method Not Allowed" },
    { Allow: allowedMethods.join(", ") }
  );
}

export function getParam(event, name) {
  const value = event.queryStringParameters?.[name];

  if (value) {
    return value;
  }

  const pathParts = event.path.split("/").filter(Boolean);
  return pathParts.at(-1);
}

export function parseJsonBody(event) {
  if (!event.body) {
    return {};
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return JSON.parse(body);
}

export async function handleJson(callback) {
  try {
    const result = await callback();
    return jsonResponse(
      result.statusCode ?? 200,
      result.body ?? result,
      result.headers
    );
  } catch (error) {
    const statusCode = error?.status ?? 500;

    if (statusCode === 500) {
      console.error(error);
    }

    return jsonResponse(statusCode, {
      ok: false,
      error: error?.message ?? "Internal Server Error"
    });
  }
}
