import { postSimulatorEvent } from "../../backend/src/http/simulator.js";
import {
  getDatabase,
  handleJson,
  methodNotAllowed,
  parseJsonBody
} from "../lib/functions-shared.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  return handleJson(async () => ({
    statusCode: 201,
    body: await postSimulatorEvent(getDatabase(), parseJsonBody(event))
  }));
}
