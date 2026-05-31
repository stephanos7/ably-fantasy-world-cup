import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db/transaction.js";
import { processMatchEvent } from "../scoring/process-match-event.js";

const simulatorEventSchema = z.object({
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

export function createSimulatorRouter() {
  const router = Router();

  router.post("/events", async (req, res, next) => {
    try {
      const parsed = simulatorEventSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: formatValidationError(parsed.error)
        });
        return;
      }

      const db = req.app.locals.db;

      if (!db) {
        res
          .status(503)
          .json({ ok: false, error: "Database is not configured" });
        return;
      }

      const result = await withTransaction(db, (client) =>
        processMatchEvent(client, parsed.data)
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
