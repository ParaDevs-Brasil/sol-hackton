import { Router } from "express";
import { userKeypair } from "../../auth/store.js";
import { custodialClaim, custodialPlaceBet } from "../../chain/custodial.js";
import { HttpError, asyncHandler } from "../errors.js";
import { requireChain, requireSession, type AuthedRequest } from "../middleware.js";

/** Apostas assinadas pelo server com a wallet custodial da sessão. */
export const custodialRoutes = Router();

custodialRoutes.use(requireChain, requireSession);

custodialRoutes.post(
  "/place-bet",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { marketId, outcome, lamports } = req.body ?? {};
    if (
      typeof marketId !== "string" ||
      !Number.isInteger(outcome) ||
      !Number.isInteger(lamports) ||
      lamports <= 0
    ) {
      throw new HttpError(400, "marketId, outcome e lamports (inteiro > 0) obrigatórios");
    }
    try {
      res.json(await custodialPlaceBet(userKeypair(user), marketId, outcome, lamports));
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(400, (err as Error).message);
    }
  })
);

custodialRoutes.post(
  "/claim",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { market, ticketMint, ticketAccount } = req.body ?? {};
    if (![market, ticketMint, ticketAccount].every((v) => typeof v === "string" && v)) {
      throw new HttpError(400, "market, ticketMint e ticketAccount obrigatórios");
    }
    try {
      res.json({
        signature: await custodialClaim(userKeypair(user), market, ticketMint, ticketAccount),
      });
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(400, (err as Error).message);
    }
  })
);
