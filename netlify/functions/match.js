import { getMatch } from "../../backend/src/http/read-models.js";
import {
  getDatabase,
  getParam,
  handleJson,
  jsonResponse,
  methodNotAllowed
} from "../lib/functions-shared.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const matchSlug = getParam(event, "matchSlug");
  if (!matchSlug) {
    return jsonResponse(400, { ok: false, error: "Missing matchSlug" });
  }

  return handleJson(() =>
    getMatch(getDatabase(), {
      matchSlug
    })
  );
}
