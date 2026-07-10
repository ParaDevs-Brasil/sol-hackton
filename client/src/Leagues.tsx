import { useEffect, useState } from "react";
import { useLang } from "./i18n";
import Navbar from "./Navbar";
import {
  clearMyLeague,
  loadMyLeague,
  saveMyLeague,
  type MyLeague,
} from "./profile";

interface PublicLeague {
  code: string;
  name: string;
  emoji: string;
  tier: "free" | "premium";
  memberLimit: number;
  createdAt: number;
  members: { nickname: string; bestStreak: number; updatedAt: number }[];
}

interface BusinessConfig {
  network: string;
  priceSol: number;
  treasury: string;
  freeMemberLimit: number;
  premiumMemberLimit: number;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

/* ---------- formulários de criar/entrar ---------- */

function LeagueForms({ onJoined }: { onJoined: (l: MyLeague) => void }) {
  const { t } = useLang();
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  async function create() {
    setBusy("create");
    setError("");
    try {
      const r = await api<{ league: PublicLeague; token: string }>(
        "/api/leagues",
        { name, nickname }
      );
      onJoined({ code: r.league.code, token: r.token, nickname });
    } catch (e) {
      setError((e as Error).message || t.leagues.errorGeneric);
    } finally {
      setBusy(null);
    }
  }

  async function join() {
    setBusy("join");
    setError("");
    try {
      const clean = code.trim().toUpperCase();
      const r = await api<{ league: PublicLeague; token: string }>(
        `/api/leagues/${clean}/join`,
        { nickname }
      );
      onJoined({ code: r.league.code, token: r.token, nickname });
    } catch (e) {
      setError((e as Error).message || t.leagues.errorGeneric);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <label className="field">
        <span>{t.leagues.nicknameLabel}</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t.leagues.nicknamePlaceholder}
          maxLength={20}
        />
      </label>

      <div className="league-forms">
        <div className="league-form-card">
          <h3>{t.leagues.createTitle}</h3>
          <label className="field">
            <span>{t.leagues.nameLabel}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.leagues.namePlaceholder}
              maxLength={30}
            />
          </label>
          <button
            className="primary"
            disabled={busy !== null || !nickname.trim() || !name.trim()}
            onClick={create}
          >
            {busy === "create" ? t.leagues.working : t.leagues.createBtn}
          </button>
        </div>

        <div className="league-form-card">
          <h3>{t.leagues.joinTitle}</h3>
          <label className="field">
            <span>{t.leagues.codeLabel}</span>
            <input
              className="mono"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t.leagues.codePlaceholder}
              maxLength={6}
            />
          </label>
          <button
            disabled={busy !== null || !nickname.trim() || !code.trim()}
            onClick={join}
          >
            {busy === "join" ? t.leagues.working : t.leagues.joinBtn}
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
    </>
  );
}

/* ---------- upsell premium com pagamento on-chain ---------- */

function PremiumUpsell({
  my,
  onUpgraded,
}: {
  my: MyLeague;
  onUpgraded: (l: PublicLeague) => void;
}) {
  const { t } = useLang();
  const [cfg, setCfg] = useState<BusinessConfig | null>(null);
  const [txSig, setTxSig] = useState("");
  const [emoji, setEmoji] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<BusinessConfig>("/api/business/config").then(setCfg).catch(() => {});
  }, []);

  async function upgrade() {
    setBusy(true);
    setError("");
    try {
      const league = await api<PublicLeague>(
        `/api/leagues/${my.code}/upgrade`,
        { token: my.token, txSig, emoji }
      );
      onUpgraded(league);
    } catch (e) {
      setError((e as Error).message || t.leagues.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  function copyWallet() {
    if (!cfg) return;
    navigator.clipboard.writeText(cfg.treasury).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="premium-card">
      <div className="premium-head">
        <strong>{t.leagues.upsellTitle}</strong>
        {cfg && (
          <span className="premium-price mono">
            {t.leagues.price(cfg.priceSol, cfg.network)}
          </span>
        )}
      </div>
      <ul className="premium-list">
        {t.leagues.upsellItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {cfg && (
        <>
          <p className="premium-step">{t.leagues.payStep1}</p>
          <div className="wallet-row">
            <code className="mono wallet-address">{cfg.treasury}</code>
            <button className="small-btn" onClick={copyWallet}>
              {copied ? t.leagues.copied : t.leagues.copyWallet}
            </button>
          </div>
          <p className="premium-step">{t.leagues.payStep2}</p>
          <label className="field">
            <span>{t.leagues.txSigLabel}</span>
            <input
              className="mono"
              value={txSig}
              onChange={(e) => setTxSig(e.target.value)}
              placeholder={t.leagues.txSigPlaceholder}
            />
          </label>
          <label className="field">
            <span>{t.leagues.emojiLabel}</span>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🏆"
              maxLength={4}
            />
          </label>
          <button
            className="primary"
            disabled={busy || !txSig.trim()}
            onClick={upgrade}
          >
            {busy ? t.leagues.working : t.leagues.upgradeBtn}
          </button>
        </>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

/* ---------- leaderboard da liga ---------- */

function LeagueBoard({
  my,
  onLeave,
}: {
  my: MyLeague;
  onLeave: () => void;
}) {
  const { t } = useLang();
  const [league, setLeague] = useState<PublicLeague | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  async function refresh() {
    setError("");
    try {
      setLeague(await api<PublicLeague>(`/api/leagues/${my.code}`));
    } catch (e) {
      setError((e as Error).message || t.leagues.errorGeneric);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [my.code]);

  function copyCode() {
    navigator.clipboard.writeText(my.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (error) {
    return (
      <div className="league-board">
        <p className="form-error">{error}</p>
        <div className="league-actions">
          <button onClick={refresh}>{t.leagues.refresh}</button>
          <button className="ghost-btn" onClick={onLeave}>
            {t.leagues.leave}
          </button>
        </div>
      </div>
    );
  }
  if (!league) return <p className="dim">{t.game.loading}</p>;

  return (
    <div className="league-board">
      <div className="league-head">
        <div className="league-title">
          <span className="league-emoji">{league.emoji}</span>
          <div>
            <h3>{league.name}</h3>
            <span className="dim">
              {t.leagues.members(league.members.length, league.memberLimit)}
            </span>
          </div>
        </div>
        <span
          className={`league-tier mono ${
            league.tier === "premium" ? "premium" : ""
          }`}
        >
          {league.tier === "premium" ? t.leagues.premiumTag : t.leagues.freeTag}
        </span>
      </div>

      <div className="code-row">
        <span className="dim">{t.leagues.codeShare}</span>
        <code className="mono league-code">{my.code}</code>
        <button className="small-btn" onClick={copyCode}>
          {copied ? t.leagues.copied : t.leagues.copyCode}
        </button>
      </div>

      <table className="league-table">
        <thead>
          <tr>
            <th className="mono">#</th>
            <th>{t.leagues.tablePlayer}</th>
            <th>🔥 {t.leagues.tableStreak}</th>
          </tr>
        </thead>
        <tbody>
          {league.members.map((m, i) => (
            <tr
              key={m.nickname}
              className={m.nickname === my.nickname ? "me" : ""}
            >
              <td className="mono">{i + 1}</td>
              <td>
                {m.nickname}
                {m.nickname === my.nickname && (
                  <span className="you-chip mono">{t.leagues.you}</span>
                )}
              </td>
              <td className="mono">{m.bestStreak}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="league-actions">
        <button onClick={refresh}>{t.leagues.refresh}</button>
        <button className="ghost-btn" onClick={onLeave}>
          {t.leagues.leave}
        </button>
      </div>

      {upgraded && <p className="upgrade-ok">{t.leagues.upgradeOk}</p>}
      {league.tier === "free" && (
        <PremiumUpsell
          my={my}
          onUpgraded={(l) => {
            setLeague(l);
            setUpgraded(true);
          }}
        />
      )}
    </div>
  );
}

/* ---------- página ---------- */

export default function Leagues() {
  const { t } = useLang();
  const [my, setMy] = useState<MyLeague | null>(() => loadMyLeague());

  return (
    <div className="game-page">
      <Navbar
        links={[
          { label: t.nav.home, href: "#/" },
          { label: t.nav.leagues, href: "#/ligas", active: true },
          { label: t.nav.profile, href: "#/perfil" },
        ]}
        cta={{ label: t.nav.play, href: "#/jogar" }}
      />

      <div className="shell page-shell">
        <header className="game-hero">
          <h1 className="game-question">
            🏆 {t.leagues.title.split(" ")[0]}{" "}
            <span className="accent">
              {t.leagues.title.split(" ").slice(1).join(" ")}
            </span>
          </h1>
          <p className="game-sub">{t.leagues.lead}</p>
        </header>

        {my ? (
          <LeagueBoard
            my={my}
            onLeave={() => {
              clearMyLeague();
              setMy(null);
            }}
          />
        ) : (
          <LeagueForms
            onJoined={(l) => {
              saveMyLeague(l);
              setMy(l);
            }}
          />
        )}

        <footer>
          <a href="#/">{t.leagues.backHome}</a>
        </footer>
      </div>
    </div>
  );
}
