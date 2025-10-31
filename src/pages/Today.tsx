import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { useProfile, getProfileStats } from "../hooks/useProfile";
import { useTasks } from "../hooks/useTasks";
import { useDailyCounters } from "../hooks/useDailyCounters";
import {
  calcXpGain,
  fatigueMultiplierForIndex,
} from "../game/xp";
import type { Task } from "../hooks/useTasks";
import { TaskSectionCard } from "../components/today/TaskSectionCard";
import { TaskList } from "../components/today/TaskList";
import { useAchievements } from "../hooks/useAchievements";
import { useToast } from "../components/ui/ToastProvider";
import { getStatMultiplierForTask, STAT_LABELS, getPrimaryStatKey } from "../game/stats";
import { useStreak } from "../hooks/useStreak";
import { useInventory } from "../hooks/useInventory";
import { useEquipment } from "../hooks/useEquipment";
import { useDailyReward } from "../hooks/useDailyReward";
import { useStory } from "../hooks/useStory";
import { useQuestSuggestions } from "../hooks/useQuestSuggestions";
import { useOfflineSync } from "../hooks/useOfflineSync";

const EFFORT_BASE_XP: Record<string, number> = {
  light: 8,
  standard: 12,
  hard: 18,
};

const getTodayKey = (): string => {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()];
};

type CompletionRow = { task_id: string };

export default function Today() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const { profile, loading: profLoading, error: profError, refetch, addXp, addCoins } =
    useProfile(userId);
  const { tasks, loading: tasksLoading, addTask } = useTasks(userId);
  const counters = useDailyCounters(userId); // 回数カウンタ
  const achievementsState = useAchievements(userId);
  const {
    streak,
    loading: streakLoading,
    error: streakError,
    refetch: refetchStreak,
  } = useStreak(userId);
  const {
    items: inventoryItems,
    consume: consumeItem,
    loading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventory(userId);
  const {
    equipped,
    loading: equipmentLoading,
    error: equipmentError,
  } = useEquipment(userId);
  const { showToast } = useToast();
  const profileStats = useMemo(() => getProfileStats(profile), [profile]);
  const dailyReward = useDailyReward(userId);
  const story = useStory(userId);
  const questSuggestions = useQuestSuggestions(userId, story.currentChapter);

  const [completedEver, setCompletedEver] = useState<Set<string>>(new Set());
  const currentChapterTitle = story.currentChapter?.title ?? "冒険開始前";
  const storyRequirementsSummary = useMemo(() => {
    const next = story.nextChapter;
    if (!next) return [] as string[];
    const reqs: string[] = [];
    if (next.required_stat_key) {
      const label = STAT_LABELS[next.required_stat_key] ?? next.required_stat_key.toUpperCase();
      const need = next.required_stat_value ?? 0;
      const current = profileStats[next.required_stat_key] ?? 0;
      reqs.push(`ステータス ${label} ${current}/${need}`);
    }
    if (next.required_streak) {
      const need = next.required_streak;
      const current = streak?.current_streak ?? 0;
      reqs.push(`連続達成 ${current}/${need}日`);
    }
    if (next.required_quest_code) {
      const quest = story.questsByCode.get(next.required_quest_code);
      reqs.push(quest ? `キー・クエスト「${quest.title}」` : "キー・クエスト達成");
    }
    return reqs;
  }, [story.nextChapter, story.questsByCode, profileStats, streak?.current_streak]);

  useEffect(() => {
    if (streakError) {
      showToast(`連続達成情報の取得に失敗しました: ${streakError}`, {
        variant: "error",
      });
    }
    if (inventoryError) {
      showToast(`アイテム情報の取得に失敗しました: ${inventoryError}`, {
        variant: "error",
      });
    }
    if (equipmentError) {
      showToast(`装備情報の取得に失敗しました: ${equipmentError}`, {
        variant: "error",
      });
    }
    if (story.error) {
      showToast(`ストーリー情報の取得に失敗しました: ${story.error}`, {
        variant: "error",
      });
    }
    if (dailyReward.error) {
      showToast(`デイリーボーナス情報の取得に失敗しました: ${dailyReward.error}`, {
        variant: "error",
      });
    }
    if (questSuggestions.error) {
      showToast(`キークエスト提案の取得に失敗しました: ${questSuggestions.error}`, {
        variant: "error",
      });
    }
  }, [streakError, inventoryError, equipmentError, story.error, dailyReward.error, questSuggestions.error, showToast]);

  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // アコーディオン開閉
  const [showDoneDaily, setShowDoneDaily] = useState(false);
  const [showDoneWeekly, setShowDoneWeekly] = useState(false);
  const [showDoneOnce, setShowDoneOnce] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  const todayKey = getTodayKey();

  // 日替わりチェック（簡易リセット）
  useEffect(() => {
    const lastDate = localStorage.getItem("cq_lastDate");
    const today = new Date().toISOString().split("T")[0];
    if (lastDate !== today) {
      localStorage.setItem("cq_lastDate", today);
      setDoneToday(new Set());
      counters.reload?.(); // カウンタも日替わりで再読込
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 今日の完了ログ取得
  const fetchCompletionsToday = useCallback(async () => {
    if (!userId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("task_completions")
      .select("task_id")
      .eq("user_id", userId)
      .gte("completed_at", today.toISOString());
    if (!error && data) {
      setDoneToday(new Set((data as CompletionRow[]).map((r) => r.task_id)));
    }
  }, [userId]);

  const fetchCompletionsEver = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("task_completions")
      .select("task_id")
      .eq("user_id", userId);
    if (!error && data) {
      setCompletedEver(new Set((data as CompletionRow[]).map((r) => r.task_id)));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchCompletionsToday();
    fetchCompletionsEver();
  }, [userId, fetchCompletionsEver, fetchCompletionsToday]);

  // 今日対象のタスク（once/daily/weekly）
  const todaysTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.repeat_type === "daily") return true;
      if (t.repeat_type === "weekly") return t.weekly_days?.includes(todayKey) ?? false;
      if (!t.repeat_type || t.repeat_type === "once") return true;
      return false;
    });
  }, [tasks, todayKey]);

  // 回数指定タスクが完了可能か
  const isReadyToComplete = (t: Task) => {
    if (!t.requires_count) return true;
    const now = counters.get(t.id);
    const target = t.target_count ?? 1;
    return now >= target;
  };

  // ✅ 未完了を「期限→作成順」でソート（要求どおり反映）
  const remainingTasksToday = useMemo(() => {
    const list = todaysTasks.filter((t) => {
      if (t.repeat_type === "once" && completedEver.has(t.id)) return false;
      return !doneToday.has(t.id);
    });
    return list.sort((a, b) => {
      const da = a.due_date ?? "";
      const db = b.due_date ?? "";
      if (da && db) return da.localeCompare(db);
      if (da && !db) return -1;
      if (!da && db) return 1;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });
  }, [todaysTasks, doneToday, completedEver]);

  // 今日の完了済み（毎日/毎週/一回きり）に分割
  const doneDailyToday = useMemo(
    () => todaysTasks.filter((t) => t.repeat_type === "daily" && doneToday.has(t.id)),
    [todaysTasks, doneToday]
  );
  const doneWeeklyToday = useMemo(
    () => todaysTasks.filter((t) => t.repeat_type === "weekly" && doneToday.has(t.id)),
    [todaysTasks, doneToday]
  );
  const doneOnceToday = useMemo(
    () =>
      todaysTasks.filter(
        (t) => (!t.repeat_type || t.repeat_type === "once") && doneToday.has(t.id)
      ),
    [todaysTasks, doneToday]
  );

  // 疲労＆XP表示
  const equippedList = useMemo(
    () =>
      Object.values(equipped)
        .filter((e): e is NonNullable<typeof e> => !!e),
    [equipped]
  );

  const equipmentBonuses = useMemo(() => {
    let fatigueSteps = 0;
    let xpPercent = 0;
    equippedList.forEach((eq) => {
      const value = Number(eq.effect_value) || 0;
      if (eq.effect_type === "fatigue_step") {
        fatigueSteps += Math.round(value);
      } else if (eq.effect_type === "xp_percent") {
        xpPercent += value;
      }
    });
    return { fatigueSteps, xpPercent };
  }, [equippedList]);

  const refreshAfterSync = useCallback(async () => {
    await Promise.allSettled([
      fetchCompletionsToday(),
      fetchCompletionsEver(),
      refetch(),
      refetchStreak(),
      counters.reload(),
      dailyReward.refetch(),
      questSuggestions.refetch(),
    ]);
  }, [
    counters,
    dailyReward,
    fetchCompletionsEver,
    fetchCompletionsToday,
    questSuggestions,
    refetch,
    refetchStreak,
  ]);

  const offlineSync = useOfflineSync(userId, { onSynced: refreshAfterSync });

  const isNetworkError = useCallback((error: unknown) => {
    if (!error) return !navigator.onLine;
    const message =
      typeof error === "string" ? error : (error as any)?.message ?? "";
    if (!message) return !navigator.onLine;
    return (
      !navigator.onLine ||
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("fetch")
    );
  }, []);

  const handleOfflineTaskCompletion = useCallback(
    (task: Task) => {
      if (!task.id) return;
      offlineSync.enqueueCompletion(task.id);
      setDoneToday((prev) => new Set(prev).add(task.id));
      setCompletedEver((prev) => new Set(prev).add(task.id));
      showToast("オフラインで完了を記録しました。再接続後に同期されます。", {
        variant: "success",
      });
    },
    [offlineSync, showToast]
  );

  const handleOfflineCounterUpdate = useCallback(
    (taskId: string, next: number) => {
      offlineSync.enqueueCounter(taskId, next);
      counters.setLocal(taskId, next);
      showToast("オフラインで回数を保存しました。再接続後に同期されます。", {
        variant: "success",
      });
    },
    [counters, offlineSync, showToast]
  );

  const xpPreviewForTask = useCallback(
    (task: Task, index: number) => {
      const fatigueIndexBase = doneToday.size + index;
      const fatigueIndexWithEquip = Math.max(
        0,
        fatigueIndexBase - equipmentBonuses.fatigueSteps
      );
      const fatigueMultiplierBase = fatigueMultiplierForIndex(fatigueIndexBase);
      const fatigueMultiplierWithEquip = fatigueMultiplierForIndex(
        fatigueIndexWithEquip
      );

      const statInfo = getStatMultiplierForTask(task, profileStats);

      const base = calcXpGain(task.base_xp, fatigueMultiplierBase);
      const withEquipmentRaw = calcXpGain(
        task.base_xp,
        fatigueMultiplierWithEquip * statInfo.multiplier
      );
      const withEquipment = Math.round(
        withEquipmentRaw * (1 + equipmentBonuses.xpPercent / 100)
      );
      const total = Math.max(withEquipment, base);
      return {
        total,
        base,
      };
    },
    [doneToday.size, profileStats, equipmentBonuses]
  );

  // 完了処理（回数指定は目標到達で有効）
  const completeTask = async (t: Task) => {
    if (!userId || !t.id) return;
    if (doneToday.has(t.id)) return;
    if (!isReadyToComplete(t)) return;
    if (!navigator.onLine) {
      handleOfflineTaskCompletion(t);
      return;
    }
    const statInfo = getStatMultiplierForTask(t, profileStats);
    const statKey = getPrimaryStatKey(t);

    const fatigueItem = inventoryItems
      .filter((item) => item.effect_type === "fatigue_reduce" && item.quantity > 0)
      .sort((a, b) => Number(b.effect_value) - Number(a.effect_value))[0];
    const xpItem = inventoryItems
      .filter((item) => item.effect_type === "xp_boost" && item.quantity > 0)
      .sort((a, b) => Number(b.effect_value) - Number(a.effect_value))[0];

    let selectedFatigueItem: typeof fatigueItem | undefined;
    if (fatigueItem) {
      const reduction = Math.max(0, Math.round(Number(fatigueItem.effect_value) || 0));
      const msg =
        `${fatigueItem.name} を使用すると疲労段階を最大 ${reduction} 段階戻せます。\n` +
        `使用しますか？（所持数 ${fatigueItem.quantity}）`;
      const confirmUse =
        typeof window === "undefined" ? true : window.confirm(msg);
      if (confirmUse) selectedFatigueItem = fatigueItem;
    }

    let selectedXpItem: typeof xpItem | undefined;
    if (xpItem) {
      const bonus = Math.round(Number(xpItem.effect_value) || 0);
      const msg =
        `${xpItem.name} を使用すると獲得XPに +${bonus} 追加されます。\n` +
        `使用しますか？（所持数 ${xpItem.quantity}）`;
      const confirmUse =
        typeof window === "undefined" ? true : window.confirm(msg);
      if (confirmUse) selectedXpItem = xpItem;
    }

    const fatigueIndexBase = doneToday.size;
    const equipmentFatigueStep = Math.max(0, equipmentBonuses.fatigueSteps);
    const equipmentXpPercent = equipmentBonuses.xpPercent;
    const itemFatigueStep = selectedFatigueItem
      ? Math.max(0, Math.round(Number(selectedFatigueItem.effect_value) || 0))
      : 0;

    const fatigueIndexAfterEquipment = Math.max(0, fatigueIndexBase - equipmentFatigueStep);
    const fatigueIndexEffective = Math.max(0, fatigueIndexAfterEquipment - itemFatigueStep);

    const fatigueMultiplierBase = fatigueMultiplierForIndex(fatigueIndexBase);
    const fatigueMultiplierEffective = fatigueMultiplierForIndex(fatigueIndexEffective);

    const baseGain = calcXpGain(t.base_xp, fatigueMultiplierBase);
    const gainWithEquipmentBase = calcXpGain(
      t.base_xp,
      fatigueMultiplierEffective * statInfo.multiplier
    );
    const gainWithEquipment = Math.round(
      gainWithEquipmentBase * (1 + equipmentXpPercent / 100)
    );
    const xpBonusFlat = selectedXpItem ? Math.round(Number(selectedXpItem.effect_value) || 0) : 0;
    const finalGain = gainWithEquipment + xpBonusFlat;
    const bonusXp = Math.max(0, finalGain - baseGain);

    const beforeUnlocked = new Set(
      achievementsState.achievements.filter((a) => a.unlocked).map((a) => a.id)
    );
    setSavingId(t.id);
    try {
      const { error } = await supabase
        .from("task_completions")
        .insert([{ user_id: userId, task_id: t.id }]);
      if (error) throw error;
      await fetchCompletionsToday();
      await fetchCompletionsEver();
      if (bonusXp > 0) {
        try {
          await addXp(bonusXp);
          showToast(
            `${STAT_LABELS[statKey]}ボーナス +${bonusXp}XP`,
            { variant: "success" }
          );
        } catch (bonusErr: any) {
          console.error("[today.completeTask] bonus xp failed", bonusErr);
          showToast(`ボーナスXPの付与に失敗しました: ${bonusErr?.message ?? bonusErr}`, {
            variant: "error",
          });
        }
      }
      const coinGain = Math.max(1, Math.floor(finalGain / 2));
      try {
        await addCoins(coinGain);
        showToast(`コイン +${coinGain}`, { variant: "success" });
      } catch (coinErr: any) {
        console.error("[today.completeTask] coin reward failed", coinErr);
        showToast(`コイン付与に失敗しました: ${coinErr?.message ?? coinErr}`, {
          variant: "error",
        });
      }
      if (selectedFatigueItem) {
        try {
          await consumeItem(selectedFatigueItem.id);
          refetchInventory();
          showToast(
            `${selectedFatigueItem.name} を使用：疲労段階 -${itemFatigueStep}`,
            { variant: "success" }
          );
        } catch (consumeErr: any) {
          console.error("[today.completeTask] consume fatigue item failed", consumeErr);
          showToast(
            `アイテム消費に失敗しました: ${consumeErr?.message ?? consumeErr}`,
            { variant: "error" }
          );
        }
      }
      if (selectedXpItem) {
        try {
          await consumeItem(selectedXpItem.id);
          refetchInventory();
          showToast(`${selectedXpItem.name} を使用：XP +${xpBonusFlat}`, {
            variant: "success",
          });
        } catch (consumeErr: any) {
          console.error("[today.completeTask] consume xp item failed", consumeErr);
          showToast(
            `アイテム消費に失敗しました: ${consumeErr?.message ?? consumeErr}`,
            { variant: "error" }
          );
        }
      }
      await Promise.all([refetch(), refetchStreak()]);
      let updated = achievementsState.achievements;
      try {
        updated = await achievementsState.refetch();
      } catch (err) {
        console.error("[today.completeTask] achievements refetch failed", err);
      }
      const newlyUnlocked = updated.filter(
        (a) => a.unlocked && !beforeUnlocked.has(a.id)
      );
      newlyUnlocked.forEach((a) => {
        showToast(`${a.icon ?? "🏅"} ${a.name} を獲得！`, { variant: "success" });
      });
    } catch (e: any) {
      if (isNetworkError(e)) {
        handleOfflineTaskCompletion(t);
        return;
      }
      showToast(`完了処理に失敗しました: ${e.message ?? e}`, { variant: "error" });
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  // カウンタ操作
  const inc = async (t: Task, delta: number) => {
    const cur = counters.get(t.id);
    const next = Math.max(0, cur + delta);
    if (!navigator.onLine) {
      handleOfflineCounterUpdate(t.id, next);
      return;
    }
    try {
      await counters.setCount(t.id, next);
    } catch (e: any) {
      if (isNetworkError(e)) {
        handleOfflineCounterUpdate(t.id, next);
        return;
      }
      showToast(`更新に失敗しました: ${e.message ?? e}`, { variant: "error" });
    }
  };

  const fillCountAndComplete = async (t: Task) => {
    if (!t.requires_count) {
      await completeTask(t);
      return;
    }
    const target = t.target_count ?? 1;
    if (target <= 0) return;
    if (!navigator.onLine) {
      handleOfflineCounterUpdate(t.id, target);
      handleOfflineTaskCompletion(t);
      return;
    }
    try {
      await counters.setCount(t.id, target);
    } catch (e: any) {
      if (isNetworkError(e)) {
        handleOfflineCounterUpdate(t.id, target);
        handleOfflineTaskCompletion(t);
      } else {
        showToast(`更新に失敗しました: ${e.message ?? e}`, { variant: "error" });
      }
      return;
    }
    await completeTask(t);
  };

  // 画面分岐
  if (!userId)
    return (
      <section className="page">
        <div className="card">未ログインです。</div>
      </section>
    );
  if (
    profLoading ||
    tasksLoading ||
    streakLoading ||
    inventoryLoading ||
    equipmentLoading ||
    story.loading ||
    dailyReward.loading ||
    questSuggestions.loading
  )
    return (
      <section className="page">
        <div className="card">読み込み中...</div>
      </section>
    );
  if (profError)
    return (
      <section className="page">
        <div className="card">エラー: {String(profError)}</div>
      </section>
    );

  return (
    <>
      <section className="page">
      {(story.currentChapter || story.nextChapter) && (
        <div className="card story-summary">
          <div>
            <div className="muted" style={{ fontSize: 12 }}>現在の章</div>
            <strong>{currentChapterTitle}</strong>
          </div>
          {story.nextChapter && (
            <div className="story-summary__next">
              <div className="muted" style={{ fontSize: 12 }}>次章: {story.nextChapter.title}</div>
              {storyRequirementsSummary.length > 0 && (
                <ul className="story-req-list">
                  {storyRequirementsSummary.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!dailyReward.state || !dailyReward.state.last_claimed_at?.startsWith(new Date().toISOString().split("T")[0]) ? (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>ChronoQuest</h2>
              <p className="muted">日々の挑戦で冒険を進めよう！</p>
            </div>
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  const result = await dailyReward.claim();
                  await Promise.all([refetch(), refetchStreak(), dailyReward.refetch()]);
                  showToast(`デイリーボーナス獲得！コイン +${result?.coins ?? 50}`, {
                    variant: "success",
                  });
                } catch (e: any) {
                  showToast(`デイリーボーナスの取得に失敗しました: ${e?.message ?? e}`, {
                    variant: "error",
                  });
                }
              }}
            >
              デイリー報酬を受け取る
            </button>
          </div>
        </div>
      ) : null}

      <TaskSectionCard
        title="今日のクエスト（未完了）"
        hint="回数指定は目標到達で完了可能"
      >
        <TaskList
          tasks={remainingTasksToday}
          doneSet={doneToday}
          savingId={savingId}
          getCount={counters.get}
          isReadyToComplete={isReadyToComplete}
          onComplete={completeTask}
          onAdjustCount={inc}
          onFillCount={fillCountAndComplete}
          getXpPreview={xpPreviewForTask}
        />
      </TaskSectionCard>

      {questSuggestions.suggestions.length > 0 && (
        <TaskSectionCard
          title="AIからの提案クエスト"
          collapsible
          open={showAiSuggestions}
          onToggle={() => setShowAiSuggestions((p) => !p)}
          hint="気分転換のヒント"
        >
          <div className="muted" style={{ marginBottom: 10, fontSize: 12 }}>
            今の進行状況に合わせたショートクエスト案です。採用するとタスクに追加されます。
          </div>
          <ul className="list list--compact">
            {questSuggestions.suggestions.map((s) => (
              <li className="list__item" key={s.id}>
                <div>
                  <strong>{s.title}</strong>
                  {s.description && (
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{s.description}</div>
                  )}
                  {s.notes && (
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{s.notes}</div>
                  )}
                  <div className="chip-row" style={{ marginTop: 6 }}>
                    {s.task_category && <span className="chip chip--ghost">カテゴリ: {s.task_category}</span>}
                    {s.effort_level && <span className="chip chip--ghost">強度: {s.effort_level}</span>}
                    {s.source && <span className="chip chip--ghost">提案元: {s.source}</span>}
                  </div>
                </div>
                <div className="ai-suggestion__actions">
                  <button
                    className="btn btn--small primary"
                    onClick={async () => {
                      try {
                        const effort = s.effort_level ?? "standard";
                        const baseXp = EFFORT_BASE_XP[effort] ?? 12;
                        await addTask({
                          title: s.title,
                          category: s.task_category ?? "study",
                          effort_level: effort,
                          base_xp: baseXp,
                          story_quest_code: null,
                          requires_count: false,
                          target_count: undefined,
                          unit: undefined,
                          notes: s.notes ?? s.description ?? null,
                        });
                        await questSuggestions.acceptSuggestion(s.id);
                        showToast("AI提案をタスクに追加しました", { variant: "success" });
                      } catch (e: any) {
                        showToast(`追加に失敗しました: ${e?.message ?? e}`, { variant: "error" });
                      }
                    }}
                  >
                    採用
                  </button>
                  <button
                    className="btn btn--small"
                    onClick={() =>
                      questSuggestions
                        .dismissSuggestion(s.id)
                        .then(() => showToast("提案をスキップしました", { variant: "success" }))
                        .catch((e: any) =>
                          showToast(`スキップに失敗しました: ${e?.message ?? e}`, {
                            variant: "error",
                          })
                        )
                    }
                  >
                    スキップ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </TaskSectionCard>
      )}

      <TaskSectionCard
        title="✅ 今日の完了済み（毎日）"
        collapsible
        open={showDoneDaily}
        onToggle={() => setShowDoneDaily((p) => !p)}
      >
        <TaskList
          tasks={doneDailyToday}
          doneSet={doneToday}
          savingId={savingId}
          getCount={counters.get}
          isReadyToComplete={isReadyToComplete}
          onComplete={completeTask}
          onAdjustCount={inc}
          allowComplete={false}
        />
      </TaskSectionCard>

      <TaskSectionCard
        title="✅ 今日の完了済み（毎週）"
        collapsible
        open={showDoneWeekly}
        onToggle={() => setShowDoneWeekly((p) => !p)}
      >
        <TaskList
          tasks={doneWeeklyToday}
          doneSet={doneToday}
          savingId={savingId}
          getCount={counters.get}
          isReadyToComplete={isReadyToComplete}
          onComplete={completeTask}
          onAdjustCount={inc}
          allowComplete={false}
        />
      </TaskSectionCard>

      <TaskSectionCard
        title="✅ 今日の完了済み（一回きり）"
        collapsible
        open={showDoneOnce}
        onToggle={() => setShowDoneOnce((p) => !p)}
      >
        <TaskList
          tasks={doneOnceToday}
          doneSet={doneToday}
          savingId={savingId}
          getCount={counters.get}
          isReadyToComplete={isReadyToComplete}
          onComplete={completeTask}
          onAdjustCount={inc}
          allowComplete={false}
        />
      </TaskSectionCard>
      </section>
    </>
  );
}
