import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo } from "react";
import { useAuth } from "./auth/AuthProvider";
import { useProfile } from "./hooks/useProfile";
import { xpProgress } from "./game/xp";

export default function App() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { profile } = useProfile(session?.user?.id ?? null);

  useEffect(() => {
    if (loading) return;
    if (!session && !loc.pathname.startsWith("/auth")) {
      navigate("/auth", { replace: true, state: { from: loc } });
    }
    if (session && loc.pathname.startsWith("/auth")) {
      navigate("/", { replace: true });
    }
  }, [loading, session, loc, navigate]);

  const title = useMemo(() => {
    if (loc.pathname === "/") return "ChronoQuest — Today";
    if (loc.pathname.startsWith("/auth")) return "ChronoQuest — Auth";
    if (loc.pathname.startsWith("/achievements")) return "ChronoQuest — Achievements";
    if (loc.pathname.startsWith("/settings")) return "ChronoQuest — Settings";
    return `ChronoQuest — ${loc.pathname.slice(1)}`;
  }, [loc.pathname]);

  const goTo = useCallback(
    (path: string) => {
      if (loc.pathname === path) return;
      navigate(path);
    },
    [loc.pathname, navigate]
  );

  if (loading) {
    return (
      <div className="app">
        <header className="app__header"><h1>ChronoQuest</h1></header>
        <main className="app__content"><div className="card">Loading...</div></main>
      </div>
    );
  }

  const totalXp = profile?.xp ?? 0;
  const level = xpProgress(totalXp).level;
  const xpInLevel = xpProgress(totalXp).inLevel;
  const xpForNextLevel = xpProgress(totalXp).span;
  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpForNextLevel) * 100)) : 0;
  const coins = profile?.coins ?? 0;
  const isOnAchievements = loc.pathname.startsWith("/achievements");
  const isOnSettings = loc.pathname.startsWith("/settings");

  return (
    <div className="app">
      <header className="app__header">
        <div className="header-main">
          <div>
            <h1>{title}</h1>
            {session && profile?.display_name && (
              <>
                <div className="muted">冒険者: {profile.display_name}</div>
                <div className="xp-bar xp-bar--compact" aria-label={`Level ${level}, XP ${xpInLevel} of ${xpForNextLevel}`}>
                  <span className="xp-bar__label">Lv {level}</span>
                  <div className="xp-bar__track">
                    <div className="xp-bar__fill" style={{ width: `${xpPercent}%` }} />
                  </div>
                  <span className="xp-bar__value">{xpInLevel}/{xpForNextLevel}</span>
                </div>
              </>
            )}
          </div>
        </div>
        {session && (
          <div className="header-side">
            <div className="header-buttons">
              <span className="coin-chip" aria-label={`Coins ${coins}`}>
                <span className="coin-chip__icon">🪙</span>
                <span>{coins}</span>
              </span>
              <button
                type="button"
                className="btn btn--small header-button"
                onClick={() => goTo("/achievements")}
                aria-label="実績一覧を開く"
                aria-current={isOnAchievements ? "page" : undefined}
              >
                <span className="header-button__icon" aria-hidden="true">🏅</span>
                <span>実績</span>
              </button>
              <button
                type="button"
                className="btn btn--small ghost header-button header-button--icon"
                onClick={() => goTo("/settings")}
                aria-label="設定を開く"
                aria-current={isOnSettings ? "page" : undefined}
              >
                <span className="header-button__icon" aria-hidden="true">⚙️</span>
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="app__content" key={loc.pathname}>
        <Outlet />
      </main>
      <nav className="tabbar">
        {(session
          ? [
              { to: "/", label: "Today", exact: true },
              { to: "/tasks", label: "Tasks" },
              { to: "/status", label: "Status" },
              { to: "/story", label: "Story" },
              { to: "/shop", label: "Shop" },
            ]
          : [{ to: "/auth", label: "Auth", exact: true }]
        ).map((tab) => {
          const isActive = tab.exact
            ? loc.pathname === tab.to
            : loc.pathname.startsWith(tab.to);
          return (
            <button
              key={tab.to}
              type="button"
              className="tab"
              aria-current={isActive ? "page" : undefined}
              onClick={() => goTo(tab.to)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
