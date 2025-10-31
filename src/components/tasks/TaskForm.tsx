import { useMemo, useState } from "react";
import type { DbCategory, UiCategory } from "../../constants/taskCategories";
import { UI_CATEGORIES, toDbCategory } from "../../constants/taskCategories";

type RepeatType = "once" | "daily" | "weekly";

const REPEAT_TYPE_LABELS: Record<RepeatType, string> = {
  once: "1回きり",
  daily: "毎日",
  weekly: "毎週",
};

const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "月" },
  { key: "tue", label: "火" },
  { key: "wed", label: "水" },
  { key: "thu", label: "木" },
  { key: "fri", label: "金" },
  { key: "sat", label: "土" },
  { key: "sun", label: "日" },
];

export type TaskFormValues = {
  title: string;
  category: DbCategory;
  base_xp: number;
  effort_level: "light" | "standard" | "hard";
  repeat_type: RepeatType;
  weekly_days: string[] | null;
  due_date: string | null;
  requires_count: boolean;
  target_count: number | null;
  unit: string | null;
  notes: string | null;
};

type TaskFormProps = {
  submitting?: boolean;
  onSubmit: (values: TaskFormValues) => Promise<void>;
};

export function TaskForm({ submitting, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [uiCategory, setUiCategory] = useState<UiCategory>("運動");
  const [effortLevel, setEffortLevel] = useState<"light" | "standard" | "hard">(
    "standard"
  );
  const [repeatType, setRepeatType] = useState<RepeatType>("once");
  const [weeklyDays, setWeeklyDays] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>("");
  const [useDeadline, setUseDeadline] = useState<boolean>(false);
  const [deadlineOption, setDeadlineOption] = useState<"today" | "custom">("today");
  const [requiresCount, setRequiresCount] = useState<boolean>(false);
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState<string>("回");
  const [notes, setNotes] = useState<string>("");

  const effortPresets = useMemo(
    () => ({
      light: { label: "軽め", baseXp: 8 },
      standard: { label: "通常", baseXp: 12 },
      hard: { label: "ハード", baseXp: 18 },
    }),
    []
  );
  const baseXp = effortPresets[effortLevel].baseXp;

  const canSubmit = useMemo(() => !!title.trim(), [title]);

  const toggleWeeklyDay = (key: string) => {
    setWeeklyDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  };

  const reset = () => {
    setTitle("");
    setUiCategory("運動");
    setEffortLevel("standard");
    setRepeatType("once");
    setWeeklyDays([]);
    setDueDate("");
    setUseDeadline(false);
    setDeadlineOption("today");
    setRequiresCount(false);
    setTargetCount(10);
    setUnit("回");
    setNotes("");
  };

  const todayIso = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      alert("タイトルを入力してください");
      return;
    }

    if (useDeadline) {
      if (repeatType === "once" && deadlineOption === "custom" && !dueDate) {
        alert("締め切り日を選択してください");
        return;
      }
      if (repeatType !== "once" && !dueDate) {
        alert("終了予定日を選択してください");
        return;
      }
    }

    const resolveDueDate = (): string | null => {
      if (!useDeadline) return null;
      if (repeatType === "once") {
        return deadlineOption === "today" ? todayIso() : dueDate || null;
      }
      return dueDate || null;
    };

    try {
      await onSubmit({
        title: title.trim(),
        category: toDbCategory(uiCategory),
        base_xp: baseXp,
        effort_level: effortLevel,
        repeat_type: repeatType,
        weekly_days: repeatType === "weekly" ? weeklyDays : null,
        due_date: resolveDueDate(),
        requires_count: requiresCount,
        target_count: requiresCount ? targetCount : null,
        unit: requiresCount ? unit : null,
        notes: notes?.trim() ? notes.trim() : null,
      });
      reset();
    } catch (err: any) {
      alert(err?.message ?? String(err));
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        タイトル
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
      </label>

      <label>
        カテゴリ
        <select
          value={uiCategory}
          onChange={(e) => setUiCategory(e.target.value as UiCategory)}
          disabled={submitting}
        >
          {UI_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        強度
        <select
          value={effortLevel}
          onChange={(e) => setEffortLevel(e.target.value as typeof effortLevel)}
          disabled={submitting}
        >
          {(Object.keys(effortPresets) as Array<keyof typeof effortPresets>).map((key) => (
            <option key={key} value={key}>
              {effortPresets[key].label} (基礎XP {effortPresets[key].baseXp})
            </option>
          ))}
        </select>
      </label>

      <div className="muted">基礎XP: {baseXp}</div>

      <label>
        繰り返し
        <select
          value={repeatType}
          onChange={(e) => setRepeatType(e.target.value as RepeatType)}
          disabled={submitting}
        >
          {Object.entries(REPEAT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {repeatType === "weekly" && (
        <div className="weekday-grid">
          {WEEKDAYS.map((d) => (
            <label key={d.key}>
              <input
                type="checkbox"
                checked={weeklyDays.includes(d.key)}
                onChange={() => toggleWeeklyDay(d.key)}
                disabled={submitting}
              />
              {d.label}
            </label>
      ))}
    </div>
  )}

  <label className="form-inline">
    <input
      type="checkbox"
      checked={useDeadline}
      onChange={(e) => {
        const next = e.target.checked;
        setUseDeadline(next);
        if (!next) {
          setDueDate("");
          setDeadlineOption("today");
        } else if (repeatType === "once") {
          setDeadlineOption("today");
        }
      }}
      disabled={submitting}
    />
    締め切りを設定する
  </label>

  {useDeadline && repeatType !== "once" && (
    <label>
      いつまで繰り返しますか？
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={submitting}
      />
    </label>
  )}

  {useDeadline && repeatType === "once" && (
    <div className="radio-list">
      <span className="muted">締め切り</span>
      <label className="form-inline">
        <input
          type="radio"
          name="deadline-option"
          value="today"
          checked={deadlineOption === "today"}
          onChange={() => setDeadlineOption("today")}
          disabled={submitting}
        />
        今日まで
      </label>
      <label className="form-inline">
        <input
          type="radio"
          name="deadline-option"
          value="custom"
          checked={deadlineOption === "custom"}
          onChange={() => setDeadlineOption("custom")}
          disabled={submitting}
        />
        日付を指定
      </label>
      {deadlineOption === "custom" && (
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={submitting}
        />
      )}
    </div>
  )}

      <label className="form-inline">
        <input
          type="checkbox"
          checked={requiresCount}
          onChange={(e) => setRequiresCount(e.target.checked)}
          disabled={submitting}
        />
        回数を指定する
      </label>

      {requiresCount && (
        <div className="form-row">
          <label>
            目標回数
            <input
              type="number"
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              disabled={submitting}
            />
          </label>
          <label>
            単位
            <input
              placeholder="回 / 分 / ページ など"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={submitting}
            />
          </label>
        </div>
      )}

      <label>
        メモ / 備考（任意）
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={submitting}
          style={{ resize: "vertical" }}
        />
      </label>

      <button className="btn primary" type="submit" disabled={submitting || !canSubmit}>
        {submitting ? "処理中..." : "追加"}
      </button>
    </form>
  );
}
