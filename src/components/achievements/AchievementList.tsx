import type { AchievementWithState } from "../../hooks/useAchievements";

type AchievementListProps = {
  unlocked: AchievementWithState[];
  locked: AchievementWithState[];
  loading?: boolean;
  error?: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

const AchievementItem = ({
  achievement,
  unlocked,
}: {
  achievement: AchievementWithState;
  unlocked: boolean;
}) => (
  <li
    className="list__item"
    style={{
      opacity: unlocked ? 1 : 0.4,
      alignItems: "flex-start",
      gap: 12,
    }}
  >
    <div style={{ fontSize: 24, lineHeight: 1 }}>
      {achievement.icon ?? "🏅"}
    </div>
    <div>
      <b>{achievement.name}</b>
      <div className="muted">{achievement.description}</div>
      {unlocked && achievement.unlocked_at && (
        <div className="muted" style={{ marginTop: 4 }}>
          獲得日: {formatDate(achievement.unlocked_at)}
        </div>
      )}
    </div>
  </li>
);

export function AchievementList({
  unlocked,
  locked,
  loading,
  error,
}: AchievementListProps) {
  if (loading) return <div className="muted">実績を読み込み中...</div>;
  if (error) return <div className="muted">実績の取得に失敗しました: {error}</div>;

  if (unlocked.length === 0 && locked.length === 0) {
    return <div className="muted">まだ実績が登録されていません。</div>;
  }

  return (
    <div className="stack" style={{ display: "grid", gap: 12 }}>
      {locked.length > 0 && (
        <section>
          <h4>未獲得</h4>
          <ul className="list">
            {locked.map((a) => (
              <AchievementItem key={a.id} achievement={a} unlocked={false} />
            ))}
          </ul>
        </section>
      )}

      {unlocked.length > 0 && (
        <section>
          <h4>獲得済み</h4>
          <ul className="list">
            {unlocked.map((a) => (
              <AchievementItem key={a.id} achievement={a} unlocked />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
