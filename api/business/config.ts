import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  LeagueError,
  getBusinessConfig,
} from "../../server/src/leagueService.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json(getBusinessConfig());
  } catch (err) {
    const status = err instanceof LeagueError ? err.status : 500;
    res.status(status).json({ error: (err as Error).message });
  }
}
