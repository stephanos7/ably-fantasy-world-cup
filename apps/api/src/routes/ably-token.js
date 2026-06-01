import { Router } from "express";
import { Rest } from "ably";

const demoSubscribeCapability = {
  "league:*": ["subscribe"],
  "match:*": ["subscribe"]
};

export function createAblyTokenRouter() {
  const router = Router();

  router.get("/ably/token", async (_req, res, next) => {
    try {
      const apiKey = process.env.ABLY_API_KEY;

      if (!apiKey) {
        res.status(503).json({
          ok: false,
          error: "Ably token auth is not configured"
        });
        return;
      }

      const ably = new Rest({ key: apiKey });
      const tokenRequest = await ably.auth.createTokenRequest({
        capability: demoSubscribeCapability,
        ttl: 60 * 60 * 1000
      });

      res.set("Cache-Control", "no-store");
      res.json(tokenRequest);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
