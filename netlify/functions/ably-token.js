import { createAblyTokenResponse } from "../../backend/src/http/ably-token.js";
import { handleJson, methodNotAllowed } from "../lib/functions-shared.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  return handleJson(async () => ({
    body: await createAblyTokenResponse(),
    headers: { "Cache-Control": "no-store" }
  }));
}
