import type { StatCategory } from "./types";

/* Perfil local do jogador: XP, nível, badges e estatísticas por categoria.
   Guardado em localStorage — a progressão é pessoal e não depende de conta.
   (Sync com backend/carteira é a evolução natural, ver roadmap.) */

export interface ProfileStats {
  xp: number;
  gamesPlayed: number;
  totalGuesses: number;
  correctGuesses: number;
  pushes: number;
  bestStreak: number;
  catCorrect: Record<StatCategory, number>;
  badges: string[];
  updatedAt: number;
}

const PROFILE_KEY = "hilo-profile";

export const XP_PER_CORRECT = 10;
export const XP_PER_MISS = 2;
export const XP_PER_GAME = 20;

export interface LevelDef {
  id: string;
  emoji: string;
  minXp: number;
}

/* progressão Bronze → Lenda (item 16 da visão de produto) */
export const LEVELS: LevelDef[] = [
  { id: "bronze", emoji: "🥉", minXp: 0 },
  { id: "silver", emoji: "🥈", minXp: 200 },
  { id: "gold", emoji: "🥇", minXp: 600 },
  { id: "diamond", emoji: "💎", minXp: 1500 },
  { id: "master", emoji: "👑", minXp: 3500 },
  { id: "legend", emoji: "🐐", minXp: 7000 },
];

export interface BadgeDef {
  id: string;
  emoji: string;
  /* missão cumprida quando progress(p) >= goal */
  goal: number;
  progress: (p: ProfileStats) => number;
}

export const BADGES: BadgeDef[] = [
  { id: "first-correct", emoji: "🎯", goal: 1, progress: (p) => p.correctGuesses },
  { id: "streak-5", emoji: "🔥", goal: 5, progress: (p) => p.bestStreak },
  { id: "streak-10", emoji: "⚡", goal: 10, progress: (p) => p.bestStreak },
  { id: "games-20", emoji: "🎮", goal: 20, progress: (p) => p.gamesPlayed },
  { id: "guesses-100", emoji: "💯", goal: 100, progress: (p) => p.correctGuesses },
  {
    id: "all-cats",
    emoji: "🧠",
    goal: 4,
    progress: (p) =>
      (Object.values(p.catCorrect) as number[]).filter((n) => n > 0).length,
  },
];

function emptyProfile(): ProfileStats {
  return {
    xp: 0,
    gamesPlayed: 0,
    totalGuesses: 0,
    correctGuesses: 0,
    pushes: 0,
    bestStreak: Number(localStorage.getItem("hilo-best") ?? 0),
    catCorrect: { goals: 0, corners: 0, yellowCards: 0, possession: 0 },
    badges: [],
    updatedAt: Date.now(),
  };
}

export function loadProfile(): ProfileStats {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    return { ...emptyProfile(), ...(JSON.parse(raw) as ProfileStats) };
  } catch {
    return emptyProfile();
  }
}

function save(p: ProfileStats): ProfileStats {
  p.updatedAt = Date.now();
  /* badges são conquistas permanentes: uma vez cumprida a missão, ficam */
  for (const b of BADGES) {
    if (!p.badges.includes(b.id) && b.progress(p) >= b.goal) {
      p.badges.push(b.id);
    }
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  return p;
}

export function recordGuess(
  correct: boolean,
  push: boolean,
  category: StatCategory,
  streak: number
): ProfileStats {
  const p = loadProfile();
  p.totalGuesses += 1;
  if (push) {
    p.pushes += 1;
    p.xp += XP_PER_MISS;
  } else if (correct) {
    p.correctGuesses += 1;
    p.catCorrect[category] = (p.catCorrect[category] ?? 0) + 1;
    p.xp += XP_PER_CORRECT;
  } else {
    p.xp += XP_PER_MISS;
  }
  if (streak > p.bestStreak) p.bestStreak = streak;
  return save(p);
}

export function recordGameEnd(finalStreak: number): ProfileStats {
  const p = loadProfile();
  p.gamesPlayed += 1;
  p.xp += XP_PER_GAME;
  if (finalStreak > p.bestStreak) p.bestStreak = finalStreak;
  return save(p);
}

export interface LevelInfo {
  level: LevelDef;
  next: LevelDef | null;
  /* 0..1 dentro do nível atual */
  progress: number;
}

export function levelFor(xp: number): LevelInfo {
  let level = LEVELS[0];
  let next: LevelDef | null = null;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      level = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
      break;
    }
  }
  const progress = next
    ? (xp - level.minXp) / (next.minXp - level.minXp)
    : 1;
  return { level, next, progress: Math.min(1, Math.max(0, progress)) };
}

export function accuracy(p: ProfileStats): number {
  const decided = p.totalGuesses - p.pushes;
  return decided > 0 ? Math.round((p.correctGuesses / decided) * 100) : 0;
}

export function favoriteCategory(p: ProfileStats): StatCategory | null {
  const entries = Object.entries(p.catCorrect) as [StatCategory, number][];
  const best = entries.sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

/* ---------- liga do jogador (guardada junto ao perfil) ---------- */

export interface MyLeague {
  code: string;
  token: string;
  nickname: string;
}

const LEAGUE_KEY = "hilo-league";

export function loadMyLeague(): MyLeague | null {
  try {
    const raw = localStorage.getItem(LEAGUE_KEY);
    return raw ? (JSON.parse(raw) as MyLeague) : null;
  } catch {
    return null;
  }
}

export function saveMyLeague(l: MyLeague): void {
  localStorage.setItem(LEAGUE_KEY, JSON.stringify(l));
}

export function clearMyLeague(): void {
  localStorage.removeItem(LEAGUE_KEY);
}

/* envia o recorde para a liga em segundo plano; falha silenciosa */
export function syncLeagueScore(streak: number): void {
  const league = loadMyLeague();
  if (!league) return;
  fetch(`/api/leagues/${league.code}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: league.token, streak }),
  }).catch(() => {});
}
