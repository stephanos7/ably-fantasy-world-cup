import { getHealthResponse } from "../../apps/api/src/http/config.js";
import { handleJson, methodNotAllowed } from "../lib/functions-shared.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  return handleJson(() => getHealthResponse());
}
