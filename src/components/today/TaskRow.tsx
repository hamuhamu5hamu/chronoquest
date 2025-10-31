import type { Task } from "../../hooks/useTasks";

export type TaskRowXpPreview = {
  total: number;
  base: number;
};

type TaskRowProps = {
  task: Task;
  done: boolean;
  saving: boolean;
  canComplete: boolean;
  countControlVisible: boolean;
  currentCount: number;
  targetCount: number | null;
  tooltip?: string;
  onComplete: () => void;
  onAdjustCount?: (delta: number) => void;
  xpPreview?: TaskRowXpPreview;
  onFillCount?: () => void;
};

export function TaskRow({
  task,
  done,
  saving,
  canComplete,
  countControlVisible,
  currentCount,
  targetCount,
  tooltip,
  onComplete,
  onAdjustCount,
  xpPreview,
  onFillCount,
}: TaskRowProps) {
  const xpLine = xpPreview
    ? `目安XP ${xpPreview.total}`
    : `目安XP ${task.base_xp}`;
  const showFillButton =
    !!onFillCount &&
    !done &&
    typeof targetCount === "number" &&
    targetCount > 0 &&
    currentCount < targetCount;
  const itemClass = done ? "list__item list__item--done" : "list__item";

  return (
    <li className={itemClass}>
      <div>
        <b>{task.title}</b>
        <div className="muted">{xpLine}</div>
        {task.notes && <div className="muted" style={{ marginTop: 4 }}>{task.notes}</div>}
      </div>

      {countControlVisible && onAdjustCount && (
        <div className="task-counter">
          <button className="btn btn--xs" onClick={() => onAdjustCount(-1)}>
            -1
          </button>
          <span className="task-counter__value">{currentCount}</span>
          <button className="btn btn--xs" onClick={() => onAdjustCount(+1)}>
            +1
          </button>
          {showFillButton && (
            <button className="btn btn--xs ghost" onClick={onFillCount}>
              一括完了
            </button>
          )}
        </div>
      )}

      {done ? (
        <span className="chip chip--success task-status-chip">済</span>
      ) : (
        <button
          className="btn"
          disabled={!canComplete}
          onClick={onComplete}
          title={tooltip}
        >
          {saving ? "処理中…" : "完了"}
        </button>
      )}
    </li>
  );
}
