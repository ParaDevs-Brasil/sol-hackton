import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  LeagueError,
  upgradeLeague,
} from "../../../server/src/leagueService.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não suportado" });
    return;
  }
  try {
    res
      .status(200)
      .json(
        await upgradeLeague(
          req.query.code,
          req.body?.token,
          req.body?.txSig,
          req.body?.emoji
        )
      );
  } catch (err) {
    const status = err instanceof LeagueError ? err.status : 500;
    res.status(status).json({ error: (err as Error).message });
  }
}
