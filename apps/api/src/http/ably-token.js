import { Rest } from "ably";
import { createHttpError } from "./errors.js";

export const demoSubscribeCapability = {
  "league:*": ["subscribe"],
  "match:*": ["subscribe"]
};

export async function createAblyTokenResponse(env = process.env) {
  const apiKey = env.ABLY_API_KEY;

  if (!apiKey) {
    throw createHttpError(503, "Ably token auth is not configured");
  }

  const ably = new Rest({ key: apiKey });

  return ably.auth.createTokenRequest({
    capability: demoSubscribeCapability,
    ttl: 60 * 60 * 1000
  });
}
