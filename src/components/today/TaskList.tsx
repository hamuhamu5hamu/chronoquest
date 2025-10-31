import type { Task } from "../../hooks/useTasks";
import { TaskRow } from "./TaskRow";
import type { TaskRowXpPreview } from "./TaskRow";

type TaskListProps = {
  tasks: Task[];
  doneSet: Set<string>;
  savingId: string | null;
  allowComplete?: boolean;
  emptyMessage?: string;
  getCount: (taskId: string) => number;
  isReadyToComplete: (task: Task) => boolean;
  onComplete: (task: Task) => void;
  onAdjustCount: (task: Task, delta: number) => void;
  onFillCount?: (task: Task) => void;
  getXpPreview?: (task: Task, index: number) => TaskRowXpPreview | undefined;
};

export function TaskList({
  tasks,
  doneSet,
  savingId,
  allowComplete = true,
  emptyMessage = "該当するタスクはありません。",
  getCount,
  isReadyToComplete,
  onComplete,
  onAdjustCount,
  onFillCount,
  getXpPreview,
}: TaskListProps) {
  if (!tasks.length) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <ul className="list">
      {tasks.map((task, index) => {
        const done = doneSet.has(task.id);
        const hasCount = !!task.requires_count;
        const current = getCount(task.id);
        const target = task.target_count ?? 1;
        const ready = !hasCount || isReadyToComplete(task);
        const canComplete = allowComplete && !done && ready && savingId !== task.id;
        const tooltip = done
          ? "今日は完了済み"
          : hasCount && !ready
          ? "目標回数を満たすと完了できます"
          : "";

        return (
          <TaskRow
            key={task.id}
            task={task}
            done={done}
            saving={savingId === task.id}
            canComplete={canComplete}
            countControlVisible={hasCount && !done && allowComplete}
            currentCount={current}
            targetCount={target}
            tooltip={tooltip}
            onComplete={() => onComplete(task)}
            onAdjustCount={
              hasCount && allowComplete && !done
                ? (delta) => onAdjustCount(task, delta)
                : undefined
            }
            onFillCount={
              hasCount && allowComplete && !done && onFillCount
                ? () => onFillCount(task)
                : undefined
            }
            xpPreview={getXpPreview ? getXpPreview(task, index) : undefined}
          />
        );
      })}
    </ul>
  );
}
