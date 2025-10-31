import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useAchievements } from "../hooks/useAchievements";
import { AchievementList } from "../components/achievements/AchievementList";

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const {
    unlocked,
    locked,
    loading: achievementsLoading,
    error,
    refetch,
  } = useAchievements(userId);
  const [refreshing, setRefreshing] = useState(false);

  if (authLoading) {
    return (
      <section className="page">
        <div className="card">読み込み中...</div>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="page">
        <div className="card">
          <h2>実績</h2>
          <p>ログインして実績の進捗を確認しましょう。</p>
        </div>
      </section>
    );
  }

  const totalUnlocked = unlocked.length;
  const totalAchievements = unlocked.length + locked.length;

  return (
    <section className="page">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2>実績</h2>
          <div className="muted" style={{ marginTop: 4 }}>
            解放済み {totalUnlocked}/{totalAchievements}
          </div>
        </div>
        <button
          className="btn btn--small ghost"
          onClick={async () => {
            if (refreshing) return;
            setRefreshing(true);
            try {
              await refetch();
            } finally {
              setRefreshing(false);
            }
          }}
          disabled={refreshing}
        >
          {refreshing ? "更新中..." : "再読み込み"}
        </button>
      </div>

      <div className="card">
        <AchievementList
          unlocked={unlocked}
          locked={locked}
          loading={achievementsLoading}
          error={error}
        />
      </div>
    </section>
  );
}
