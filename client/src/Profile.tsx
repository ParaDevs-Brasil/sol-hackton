import { useMemo } from "react";
import { useLang } from "./i18n";
import Navbar from "./Navbar";
import {
  BADGES,
  accuracy,
  favoriteCategory,
  levelFor,
  loadProfile,
} from "./profile";
import { CATEGORY_ICONS, type StatCategory } from "./types";

export default function Profile() {
  const { t } = useLang();
  const profile = useMemo(() => loadProfile(), []);
  const info = levelFor(profile.xp);
  const fav = favoriteCategory(profile);
  const acc = accuracy(profile);
  const cats = Object.entries(profile.catCorrect) as [StatCategory, number][];
  const maxCat = Math.max(1, ...cats.map(([, n]) => n));

  return (
    <div className="game-page">
      <Navbar
        links={[
          { label: t.nav.home, href: "#/" },
          { label: t.nav.leagues, href: "#/ligas" },
          { label: t.nav.profile, href: "#/perfil", active: true },
        ]}
        cta={{ label: t.nav.play, href: "#/jogar" }}
      />

      <div className="shell page-shell">
        <header className="game-hero">
          <h1 className="game-question">
            {info.level.emoji}{" "}
            <span className="accent">
              {t.profile.levelNames[info.level.id]}
            </span>
          </h1>
          <p className="game-sub">{t.profile.lead}</p>
        </header>

        {/* nível + XP */}
        <div className="xp-card">
          <div className="xp-head">
            <strong className="mono">
              {profile.xp} {t.profile.xp}
            </strong>
            <span className="dim">
              {info.next
                ? t.profile.nextLevel(
                    t.profile.levelNames[info.next.id],
                    info.next.minXp - profile.xp
                  )
                : t.profile.maxLevel}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(info.progress * 100)}%` }}
            />
          </div>
          <span className="dim xp-rules">{t.profile.xpRules}</span>
        </div>

        {/* estatísticas */}
        <div className="scoreboard profile-stats">
          <div>
            <span className="label">{t.profile.statGames}</span>
            <strong>{profile.gamesPlayed}</strong>
          </div>
          <div>
            <span className="label">{t.profile.statGuesses}</span>
            <strong>{profile.correctGuesses}</strong>
          </div>
          <div>
            <span className="label">{t.profile.statAccuracy}</span>
            <strong>{acc}%</strong>
          </div>
          <div>
            <span className="label">{t.profile.statBest}</span>
            <strong>🔥 {profile.bestStreak}</strong>
          </div>
          <div>
            <span className="label">{t.profile.statFav}</span>
            <strong>{fav ? CATEGORY_ICONS[fav] : t.profile.none}</strong>
          </div>
        </div>

        {/* acertos por categoria */}
        <div className="panel-block cat-breakdown">
          <span className="panel-title">{t.profile.catBreakdown}</span>
          {cats.map(([cat, n]) => (
            <div className="cat-row" key={cat}>
              <span className="cat-row-label">
                {CATEGORY_ICONS[cat]} {t.game.categoryLabels[cat]}
              </span>
              <div className="cat-bar">
                <div
                  className="cat-bar-fill"
                  style={{ width: `${Math.round((n / maxCat) * 100)}%` }}
                />
              </div>
              <span className="mono cat-row-n">{n}</span>
            </div>
          ))}
        </div>

        {/* missões / conquistas */}
        <div className="panel-block missions">
          <span className="panel-title">{t.profile.missionsTitle}</span>
          <ul className="mission-list">
            {BADGES.map((b) => {
              const done = profile.badges.includes(b.id);
              const progress = Math.min(b.progress(profile), b.goal);
              const meta = t.profile.badgeNames[b.id];
              return (
                <li key={b.id} className={done ? "done" : ""}>
                  <span className="mission-emoji">{b.emoji}</span>
                  <div className="mission-text">
                    <strong>{meta.name}</strong>
                    <span className="dim">{meta.desc}</span>
                  </div>
                  <span className="mono mission-progress">
                    {done ? "✓" : `${progress}/${b.goal}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <a className="btn primary big" href="#/jogar">
          {t.profile.playCta}
        </a>

        <footer>
          <a href="#/">{t.leagues.backHome}</a>
        </footer>
      </div>
    </div>
  );
}
