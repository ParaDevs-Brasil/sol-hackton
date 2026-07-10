import type { VercelRequest, VercelResponse } from "@vercel/node";
import { LeagueError, getLeague } from "../../../server/src/leagueService.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json(getLeague(req.query.code));
  } catch (err) {
    const status = err instanceof LeagueError ? err.status : 500;
    res.status(status).json({ error: (err as Error).message });
  }
}
