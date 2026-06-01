import { getMatch } from "../../apps/api/src/http/read-models.js";
import { getDatabase, getParam, handleJson, methodNotAllowed } from "../lib/functions-shared.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  return handleJson(() =>
    getMatch(getDatabase(), {
      matchSlug: getParam(event, "matchSlug")
    })
  );
}
