import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DATA_DIR, NETWORK, rpcUrl } from "./config.js";
import { loadOrCreateKeypair } from "./wallet.js";

/* Ligas privadas (Fase 2 do roadmap): bolões entre amigos com leaderboard.
   Modelo freemium — liga básica grátis, upgrade premium pago em SOL com
   verificação on-chain da transação de pagamento.

   Armazenamento em JSON no DATA_DIR: suficiente para dev/demo. Na Vercel o
   /tmp é efêmero; produção real pediria um KV externo (mesma interface). */

export const PREMIUM_PRICE_SOL = 0.05;
export const FREE_MEMBER_LIMIT = 10;
export const PREMIUM_MEMBER_LIMIT = 100;

const LEAGUES_PATH = path.join(DATA_DIR, "leagues.json");

export interface LeagueMember {
  nickname: string;
  token: string;
  bestStreak: number;
  joinedAt: number;
  updatedAt: number;
}

export interface League {
  code: string;
  name: string;
  emoji: string;
  tier: "free" | "premium";
  createdAt: number;
  upgradeTxSig?: string;
  members: LeagueMember[];
}

interface Store {
  leagues: Record<string, League>;
  usedTxSigs: string[];
}

/* visão pública: sem os tokens dos membros */
export interface PublicLeague {
  code: string;
  name: string;
  emoji: string;
  tier: "free" | "premium";
  memberLimit: number;
  createdAt: number;
  members: { nickname: string; bestStreak: number; updatedAt: number }[];
}

function loadStore(): Store {
  try {
    return JSON.parse(fs.readFileSync(LEAGUES_PATH, "utf8")) as Store;
  } catch {
    return { leagues: {}, usedTxSigs: [] };
  }
}

function saveStore(store: Store): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LEAGUES_PATH, JSON.stringify(store, null, 2));
}

function publicView(league: League): PublicLeague {
  return {
    code: league.code,
    name: league.name,
    emoji: league.emoji,
    tier: league.tier,
    memberLimit:
      league.tier === "premium" ? PREMIUM_MEMBER_LIMIT : FREE_MEMBER_LIMIT,
    createdAt: league.createdAt,
    members: [...league.members]
      .sort((a, b) => b.bestStreak - a.bestStreak || a.joinedAt - b.joinedAt)
      .map((m) => ({
        nickname: m.nickname,
        bestStreak: m.bestStreak,
        updatedAt: m.updatedAt,
      })),
  };
}

export class LeagueError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function cleanNickname(raw: unknown): string {
  const nick = String(raw ?? "").trim();
  if (nick.length < 2 || nick.length > 20) {
    throw new LeagueError("Apelido deve ter entre 2 e 20 caracteres");
  }
  return nick;
}

function cleanLeagueName(raw: unknown): string {
  const name = String(raw ?? "").trim();
  if (name.length < 3 || name.length > 30) {
    throw new LeagueError("Nome da liga deve ter entre 3 e 30 caracteres");
  }
  return name;
}

/* código curto sem caracteres ambíguos (0/O, 1/I) */
function newCode(existing: Record<string, League>): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (;;) {
    let code = "";
    for (const byte of crypto.randomBytes(6)) {
      code += alphabet[byte % alphabet.length];
    }
    if (!existing[code]) return code;
  }
}

export function createLeague(
  nameRaw: unknown,
  nicknameRaw: unknown
): { league: PublicLeague; token: string } {
  const name = cleanLeagueName(nameRaw);
  const nickname = cleanNickname(nicknameRaw);
  const store = loadStore();
  const now = Date.now();
  const token = crypto.randomBytes(12).toString("hex");
  const league: League = {
    code: newCode(store.leagues),
    name,
    emoji: "⚽",
    tier: "free",
    createdAt: now,
    members: [
      { nickname, token, bestStreak: 0, joinedAt: now, updatedAt: now },
    ],
  };
  store.leagues[league.code] = league;
  saveStore(store);
  return { league: publicView(league), token };
}

export function getLeague(codeRaw: unknown): PublicLeague {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  const store = loadStore();
  const league = store.leagues[code];
  if (!league) throw new LeagueError("Liga não encontrada", 404);
  return publicView(league);
}

export function joinLeague(
  codeRaw: unknown,
  nicknameRaw: unknown
): { league: PublicLeague; token: string } {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  const nickname = cleanNickname(nicknameRaw);
  const store = loadStore();
  const league = store.leagues[code];
  if (!league) throw new LeagueError("Liga não encontrada", 404);

  const limit =
    league.tier === "premium" ? PREMIUM_MEMBER_LIMIT : FREE_MEMBER_LIMIT;
  if (league.members.length >= limit) {
    throw new LeagueError(
      league.tier === "premium"
        ? "Liga lotada"
        : "Liga grátis lotada — o dono pode fazer upgrade premium"
    );
  }
  if (
    league.members.some(
      (m) => m.nickname.toLowerCase() === nickname.toLowerCase()
    )
  ) {
    throw new LeagueError("Já existe alguém com esse apelido na liga");
  }

  const now = Date.now();
  const token = crypto.randomBytes(12).toString("hex");
  league.members.push({
    nickname,
    token,
    bestStreak: 0,
    joinedAt: now,
    updatedAt: now,
  });
  saveStore(store);
  return { league: publicView(league), token };
}

export function submitScore(
  codeRaw: unknown,
  tokenRaw: unknown,
  streakRaw: unknown
): PublicLeague {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  const token = String(tokenRaw ?? "");
  const streak = Number(streakRaw);
  if (!Number.isInteger(streak) || streak < 0 || streak > 1000) {
    throw new LeagueError("Sequência inválida");
  }
  const store = loadStore();
  const league = store.leagues[code];
  if (!league) throw new LeagueError("Liga não encontrada", 404);
  const member = league.members.find((m) => m.token === token);
  if (!member) throw new LeagueError("Membro não encontrado nesta liga", 403);

  if (streak > member.bestStreak) {
    member.bestStreak = streak;
    member.updatedAt = Date.now();
    saveStore(store);
  }
  return publicView(league);
}

/* ---------- premium: pagamento verificado on-chain ---------- */

export function getBusinessConfig(): {
  network: string;
  priceSol: number;
  treasury: string;
  freeMemberLimit: number;
  premiumMemberLimit: number;
} {
  return {
    network: NETWORK,
    priceSol: PREMIUM_PRICE_SOL,
    treasury: loadOrCreateKeypair().publicKey.toBase58(),
    freeMemberLimit: FREE_MEMBER_LIMIT,
    premiumMemberLimit: PREMIUM_MEMBER_LIMIT,
  };
}

/* confere na chain que txSig é uma transferência confirmada de pelo menos
   PREMIUM_PRICE_SOL para a carteira do app */
async function verifyPayment(txSig: string): Promise<void> {
  const treasury = loadOrCreateKeypair().publicKey.toBase58();
  const connection = new Connection(rpcUrl, "confirmed");
  let tx;
  try {
    tx = await connection.getParsedTransaction(txSig, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
  } catch {
    throw new LeagueError("Assinatura de transação inválida");
  }
  if (!tx) throw new LeagueError("Transação não encontrada na rede");
  if (tx.meta?.err) throw new LeagueError("Transação falhou on-chain");

  const minLamports = PREMIUM_PRICE_SOL * LAMPORTS_PER_SOL;
  const paid = tx.transaction.message.instructions.some((ix) => {
    if (!("parsed" in ix)) return false;
    const parsed = ix.parsed as {
      type?: string;
      info?: { destination?: string; lamports?: number };
    };
    return (
      parsed?.type === "transfer" &&
      parsed.info?.destination === treasury &&
      (parsed.info?.lamports ?? 0) >= minLamports
    );
  });
  if (!paid) {
    throw new LeagueError(
      `Transação não contém transferência de ${PREMIUM_PRICE_SOL} SOL para ${treasury}`
    );
  }
}

export async function upgradeLeague(
  codeRaw: unknown,
  tokenRaw: unknown,
  txSigRaw: unknown,
  emojiRaw?: unknown
): Promise<PublicLeague> {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  const token = String(tokenRaw ?? "");
  const txSig = String(txSigRaw ?? "").trim();
  if (!txSig) throw new LeagueError("Assinatura da transação é obrigatória");

  const store = loadStore();
  const league = store.leagues[code];
  if (!league) throw new LeagueError("Liga não encontrada", 404);
  const member = league.members.find((m) => m.token === token);
  if (!member) throw new LeagueError("Membro não encontrado nesta liga", 403);
  if (league.tier === "premium") {
    throw new LeagueError("Esta liga já é premium");
  }
  if (store.usedTxSigs.includes(txSig)) {
    throw new LeagueError("Essa transação já foi usada em outro upgrade");
  }

  // atalho de demonstração local, desligado por padrão
  if (!(process.env.BUSINESS_SKIP_VERIFY === "1" && txSig === "DEV")) {
    await verifyPayment(txSig);
  }

  // recarrega após o await para não perder escritas concorrentes
  const fresh = loadStore();
  const freshLeague = fresh.leagues[code];
  if (!freshLeague) throw new LeagueError("Liga não encontrada", 404);
  if (fresh.usedTxSigs.includes(txSig)) {
    throw new LeagueError("Essa transação já foi usada em outro upgrade");
  }
  freshLeague.tier = "premium";
  freshLeague.upgradeTxSig = txSig;
  const emoji = String(emojiRaw ?? "").trim();
  if (emoji) freshLeague.emoji = emoji.slice(0, 4);
  fresh.usedTxSigs.push(txSig);
  saveStore(fresh);
  return publicView(freshLeague);
}
