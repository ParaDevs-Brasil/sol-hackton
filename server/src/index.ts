import cors from "cors";
import express from "express";
import { NETWORK, PORT } from "./config.js";
import { getGameData } from "./gameService.js";
import { loadCachedCredentials } from "./txlineAuth.js";
import {
  LeagueError,
  createLeague,
  getBusinessConfig,
  getLeague,
  joinLeague,
  submitScore,
  upgradeLeague,
} from "./leagueService.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/game/status", (_req, res) => {
  const creds = loadCachedCredentials();
  res.json({
    network: NETWORK,
    txlineActivated: Boolean(creds),
    wallet: creds?.wallet ?? null,
    txSig: creds?.txSig ?? null,
  });
});

app.get("/api/game/matches", async (_req, res) => {
  try {
    const data = await getGameData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ---------- business: ligas privadas freemium ---------- */

function sendLeagueError(res: express.Response, err: unknown) {
  if (err instanceof LeagueError) {
    res.status(err.status).json({ error: err.message });
  } else {
    res.status(500).json({ error: (err as Error).message });
  }
}

app.get("/api/business/config", (_req, res) => {
  try {
    res.json(getBusinessConfig());
  } catch (err) {
    sendLeagueError(res, err);
  }
});

app.post("/api/leagues", (req, res) => {
  try {
    res.json(createLeague(req.body?.name, req.body?.nickname));
  } catch (err) {
    sendLeagueError(res, err);
  }
});

app.get("/api/leagues/:code", (req, res) => {
  try {
    res.json(getLeague(req.params.code));
  } catch (err) {
    sendLeagueError(res, err);
  }
});

app.post("/api/leagues/:code/join", (req, res) => {
  try {
    res.json(joinLeague(req.params.code, req.body?.nickname));
  } catch (err) {
    sendLeagueError(res, err);
  }
});

app.post("/api/leagues/:code/score", (req, res) => {
  try {
    res.json(submitScore(req.params.code, req.body?.token, req.body?.streak));
  } catch (err) {
    sendLeagueError(res, err);
  }
});

app.post("/api/leagues/:code/upgrade", async (req, res) => {
  try {
    res.json(
      await upgradeLeague(
        req.params.code,
        req.body?.token,
        req.body?.txSig,
        req.body?.emoji
      )
    );
  } catch (err) {
    sendLeagueError(res, err);
  }
});

app.listen(PORT, () => {
  console.log(`Hi-Lo server em http://localhost:${PORT} (rede: ${NETWORK})`);
});
