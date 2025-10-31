import type { Task } from "../../hooks/useTasks";
import type { DbCategory } from "../../constants/taskCategories";
import { CATEGORY_LABELS } from "../../constants/taskCategories";

const CATEGORY_ORDER: DbCategory[] = ["exercise", "study", "life"];

const EFFORT_LABELS: Record<string, string> = {
  light: "軽め",
  standard: "通常",
  hard: "ハード",
};

const repeatLabel = (task: Task) => {
  if (!task.repeat_type || task.repeat_type === "once") return "（一回きり）";
  if (task.repeat_type === "daily") return "（毎日）";
  if (task.repeat_type === "weekly") {
    return task.weekly_days?.length
      ? `（毎週 ${task.weekly_days.join("・")}）`
      : "（毎週）";
  }
  return "";
};

const countLabel = (task: Task) => {
  if (!task.requires_count) return "";
  const target = task.target_count ?? 0;
  const unit = task.unit ?? "回";
  return ` ・ 目標${target}${unit}`;
};

const dueLabel = (task: Task) => (task.due_date ? ` ・ 〆切 ${task.due_date}` : "");

type GroupedTaskListProps = {
  tasks: Task[];
  emptyMessage?: string;
};

export function GroupedTaskList({
  tasks,
  emptyMessage = "まだありません",
}: GroupedTaskListProps) {
  if (!tasks.length) {
    return <div className="muted">{emptyMessage}</div>;
  }

  return (
    <>
      {CATEGORY_ORDER.map((category) => {
        const items = tasks.filter((t) => t.category === category);
        if (items.length === 0) return null;
        const label = CATEGORY_LABELS[category];

        return (
          <div key={category} style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>
              {label}
            </div>
            <ul className="list">
              {items.map((t) => (
                <li className="list__item" key={t.id}>
                  <div>
                    <b>{t.title}</b>
                    <div className="muted">
                      {label} ・ 基礎XP{t.base_xp}
                      {t.effort_level && `（強度: ${EFFORT_LABELS[t.effort_level] ?? t.effort_level}）`}
                      {repeatLabel(t)}
                      {countLabel(t)}
                      {dueLabel(t)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
