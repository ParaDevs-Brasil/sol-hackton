import type { VercelRequest, VercelResponse } from "@vercel/node";
import { LeagueError, createLeague } from "../../server/src/leagueService.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não suportado" });
    return;
  }
  try {
    res.status(200).json(createLeague(req.body?.name, req.body?.nickname));
  } catch (err) {
    const status = err instanceof LeagueError ? err.status : 500;
    res.status(status).json({ error: (err as Error).message });
  }
}
