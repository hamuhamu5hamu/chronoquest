type StatusCardProps = {
  completedCount: number;
  fatigue: number;
  streakCurrent?: number;
  streakLongest?: number;
  chips?: string[];
};

export function StatusCard({
  completedCount,
  fatigue,
  streakCurrent = 0,
  streakLongest,
  chips = [],
}: StatusCardProps) {
  const longest = streakLongest ?? Math.max(streakCurrent, 0);
  const chipItems = chips.length
    ? chips
    : [`本日 ${completedCount + 1} 件目`, `疲労係数 ×${fatigue.toFixed(2)}`];
  return (
    <div className="card">
      <h2>本日の振り返り</h2>
      <div className="stat-grid">
        <div className="stat-pill">
          <span className="muted">完了したクエスト</span>
          <strong>{completedCount}</strong>
        </div>
        <div className="stat-pill">
          <span className="muted">疲労係数</span>
          <strong>×{fatigue.toFixed(2)}</strong>
        </div>
        <div className="stat-pill">
          <span className="muted">連続達成</span>
          <strong>{streakCurrent}</strong>
          <span className="muted">最長 {longest}</span>
        </div>
      </div>
      <div className="chip-row" style={{ marginTop: 16 }}>
        {chipItems.map((text) => (
          <span className="chip" key={text}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
