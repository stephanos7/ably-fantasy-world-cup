import { createDatabasePool } from "../../backend/src/db/pool.js";

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

function getRequestPath(event) {
  if (event.rawUrl) {
    try {
      return new URL(event.rawUrl).pathname;
    } catch {
      // Fall through to other path sources.
    }
  }

  return event.rawPath || event.path || "";
}

export function getParam(event, name) {
  const value =
    event.queryStringParameters?.[name] ?? event.pathParameters?.[name];

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  const pathParts = getRequestPath(event).split("/").filter(Boolean);

  if (name === "leagueSlug") {
    if (
      pathParts.length >= 4 &&
      pathParts[0] === "api" &&
      pathParts[1] === "leagues" &&
      (pathParts[3] === "activity" || pathParts[3] === "leaderboard")
    ) {
      return pathParts[2];
    }
  }

  if (name === "userSlug") {
    if (
      pathParts.length >= 4 &&
      pathParts[0] === "api" &&
      pathParts[1] === "clients" &&
      pathParts[3] === "team"
    ) {
      return pathParts[2];
    }
  }

  if (name === "matchSlug") {
    if (
      pathParts.length >= 3 &&
      pathParts[0] === "api" &&
      pathParts[1] === "matches"
    ) {
      return pathParts[2];
    }
  }

  return undefined;
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
