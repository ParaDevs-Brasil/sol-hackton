import { Router } from "express";
import { PROGRAM_ID } from "../../chain/client.js";
import { listMarkets } from "../../chain/markets.js";
import { asyncHandler } from "../errors.js";

export const marketsRoutes = Router();

marketsRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ programId: PROGRAM_ID.toBase58(), markets: await listMarkets() });
  })
);
