import { getLeagueActivity } from "../../backend/src/http/read-models.js";
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

  const leagueSlug = getParam(event, "leagueSlug");
  if (!leagueSlug) {
    return jsonResponse(400, { ok: false, error: "Missing leagueSlug" });
  }

  return handleJson(() =>
    getLeagueActivity(getDatabase(), {
      leagueSlug
    })
  );
}
