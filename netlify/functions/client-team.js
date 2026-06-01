import { getClientTeam } from "../../backend/src/http/read-models.js";
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

  const userSlug = getParam(event, "userSlug");
  if (!userSlug) {
    return jsonResponse(400, { ok: false, error: "Missing userSlug" });
  }

  return handleJson(() =>
    getClientTeam(getDatabase(), {
      userSlug
    })
  );
}
