import { z } from "zod";
import { withTransaction } from "../db/transaction.js";
import { processMatchEvent } from "../scoring/process-match-event.js";
import { createHttpError, requireDatabase } from "./errors.js";

export const simulatorEventSchema = z.object({
  matchSlug: z.string().trim().min(1),
  eventType: z.enum(["goal", "assist", "yellow_card"]),
  playerSlug: z.string().trim().min(1),
  minute: z.number().int().min(1).max(130)
});

function formatValidationError(error) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

export async function postSimulatorEvent(db, body) {
  requireDatabase(db);

  const parsed = simulatorEventSchema.safeParse(body);

  if (!parsed.success) {
    throw createHttpError(400, formatValidationError(parsed.error));
  }

  return withTransaction(db, (client) => processMatchEvent(client, parsed.data));
}
