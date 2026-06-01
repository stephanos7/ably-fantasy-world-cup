import { getHealthResponse } from "../../backend/src/http/config.js";
import { handleJson, methodNotAllowed } from "../lib/functions-shared.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  return handleJson(() => getHealthResponse());
}
