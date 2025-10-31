import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { useStory } from "../hooks/useStory";
import { ChapterGrid } from "../components/story/ChapterGrid";
import { StoryLog } from "../components/story/StoryLog";
import { useTasks } from "../hooks/useTasks";
import { useToast } from "../components/ui/ToastProvider";
import { useProfile, getProfileStats } from "../hooks/useProfile";
import { useStreak } from "../hooks/useStreak";
import { STAT_LABELS } from "../game/stats";

const EFFORT_BASE_XP: Record<string, number> = {
  light: 8,
  standard: 12,
  hard: 18,
};

type CompletionRow = { task_id: string };

export default function StoryPage() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const story = useStory(userId);
  const { tasks, addTask } = useTasks(userId);
  const { profile } = useProfile(userId);
  const { streak } = useStreak(userId);
  const { showToast } = useToast();

  const profileStats = useMemo(() => getProfileStats(profile), [profile]);

  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setCompletedTaskIds(new Set());
      return;
    }
    let cancelled = false;
    const fetchCompletions = async () => {
      const { data, error } = await supabase
        .from("task_completions")
        .select("task_id")
        .eq("user_id", userId);
      if (cancelled || error || !data) return;
      setCompletedTaskIds(new Set((data as CompletionRow[]).map((row) => row.task_id)));
    };
    fetchCompletions();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const questCompletionMap = useMemo(() => {
    const map = new Map<string, { hasTask: boolean; completed: boolean }>();
    story.quests.forEach((quest) => {
      map.set(quest.code, { hasTask: false, completed: false });
    });
    tasks.forEach((task) => {
      if (!task.story_quest_code) return;
      const entry = map.get(task.story_quest_code);
      if (!entry) return;
      entry.hasTask = true;
      entry.completed = completedTaskIds.has(task.id);
    });
    return map;
  }, [story.quests, tasks, completedTaskIds]);

  const chaptersById = useMemo(() => {
    const map = new Map<string, (typeof story.chapters)[number]>();
    story.chapters.forEach((chapter) => map.set(chapter.id, chapter));
    return map;
  }, [story.chapters]);

  const storyRequirements = useMemo(() => {
    const next = story.nextChapter;
    if (!next) return null;
    const reqs: Array<{ label: string; satisfied: boolean; info?: string }> = [];
    if (next.required_stat_key) {
      const key = next.required_stat_key;
      const label = STAT_LABELS[key] ?? key.toUpperCase();
      const need = next.required_stat_value ?? 0;
      const current = profileStats[key] ?? 0;
      reqs.push({
        label: `ステータス ${label} ≥ ${need}`,
        satisfied: current >= need,
        info: `${current}/${need}`,
      });
    }
    if (next.required_streak) {
      const need = next.required_streak;
      const current = streak?.current_streak ?? 0;
      reqs.push({
        label: `連続達成 ${need}日`,
        satisfied: current >= need,
        info: `${current}/${need}`,
      });
    }
    if (next.required_quest_code) {
      const entry = questCompletionMap.get(next.required_quest_code) ?? {
        hasTask: false,
        completed: false,
      };
      const quest = story.questsByCode.get(next.required_quest_code);
      reqs.push({
        label: quest ? `キー・クエスト「${quest.title}」` : "キー・クエスト",
        satisfied: entry.completed,
        info: entry.hasTask ? (entry.completed ? "達成済み" : "進行中") : "未追加",
      });
    }
    return { chapter: next, requirements: reqs };
  }, [story.nextChapter, profileStats, streak, questCompletionMap, story.questsByCode]);

  const questsByChapter = useMemo(() => {
    const map = new Map<string, typeof story.quests>();
    story.quests.forEach((quest) => {
      const current = map.get(quest.chapter_id) ?? [];
      map.set(quest.chapter_id, [...current, quest]);
    });
    return map;
  }, [story.quests]);

  const [unlocking, setUnlocking] = useState(false);

  const handleUnlockChapter = async (chapterId: string) => {
    if (!userId) return;
    try {
      setUnlocking(true);
      await story.unlockChapter(chapterId);
      showToast("新しい章を解放しました！", { variant: "success" });
    } catch (e: any) {
      showToast(`章の解放に失敗しました: ${e?.message ?? e}`, { variant: "error" });
    } finally {
      setUnlocking(false);
    }
  };

  const handleAddQuest = async (quest: (typeof story.quests)[number]) => {
    if (!userId) return;
    try {
      const effort = quest.effort_level ?? "standard";
      const baseXp = EFFORT_BASE_XP[effort] ?? 12;
      await addTask({
        title: quest.task_title ?? quest.title,
        category: quest.task_category ?? "study",
        effort_level: effort,
        base_xp: baseXp,
        story_quest_code: quest.code,
        requires_count: quest.task_requires_count ?? false,
        target_count: quest.task_target_count ?? undefined,
        unit: quest.task_unit ?? undefined,
        notes: quest.notes ?? quest.description ?? null,
      });
      showToast("キー・クエストをタスクに追加しました", { variant: "success" });
    } catch (e: any) {
      showToast(`クエスト追加に失敗しました: ${e?.message ?? e}`, { variant: "error" });
    }
  };

  if (!session) {
    return (
      <section className="page">
        <div className="card">
          <h2>Story</h2>
          <p>ログインして冒険の記録を確認しましょう。</p>
        </div>
      </section>
    );
  }

  if (story.loading) {
    return (
      <section className="page">
        <div className="card">読み込み中...</div>
      </section>
    );
  }

  if (story.error) {
    return (
      <section className="page">
        <div className="card">ストーリー情報の取得に失敗しました: {story.error}</div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="card">
        <h2>現在の章</h2>
        {story.currentChapter ? (
          <>
            <h3>{story.currentChapter.title}</h3>
            {story.currentChapter.summary && (
              <p className="muted" style={{ marginTop: 8 }}>{story.currentChapter.summary}</p>
            )}
          </>
        ) : (
          <p className="muted">まだ章が解放されていません。</p>
        )}
      </div>

      <div className="card">
        <ChapterGrid
          chapters={story.chapters}
          unlockedChapterIds={story.unlockedChapterIds}
          currentChapter={story.currentChapter}
          nextChapter={story.nextChapter}
          progress={story.progress}
        />
      </div>

      {storyRequirements && (
        <div className="card">
          <h2>次章の解放条件</h2>
          <h3>{storyRequirements.chapter.title}</h3>
          <ul className="list" style={{ marginTop: 12 }}>
            {storyRequirements.requirements.map((req) => (
              <li className="list__item" key={req.label}>
                <div>
                  <strong>{req.label}</strong>
                  {req.info && <div className="muted" style={{ marginTop: 4 }}>{req.info}</div>}
                </div>
                <span className={`chip ${req.satisfied ? "chip--success" : "chip--warning"}`}>
                  {req.satisfied ? "達成" : "未達"}
                </span>
              </li>
            ))}
          </ul>
          {!storyRequirements.requirements.every((req) => req.satisfied) && (
            <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
              条件を満たすと新しい章を解放できます。
            </div>
          )}
          {storyRequirements.requirements.every((req) => req.satisfied) && (
            <button
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => handleUnlockChapter(storyRequirements.chapter.id)}
              disabled={unlocking}
            >
              {unlocking ? "解放中..." : "章を解放する"}
            </button>
          )}
        </div>
      )}

      <div className="card">
        <h2>冒険の軌跡</h2>
        <StoryLog progress={story.progress} chaptersById={chaptersById} />
      </div>

      {story.currentChapter && (
        <div className="card">
          <h2>キー・クエスト</h2>
          <ul className="list">
            {(questsByChapter.get(story.currentChapter.id) ?? []).map((quest) => {
              const status = questCompletionMap.get(quest.code);
              const completed = status?.completed ?? false;
              const hasTask = status?.hasTask ?? false;
              const itemClass = completed ? "list__item list__item--done" : "list__item";
              return (
                <li className={itemClass} key={quest.id}>
                  <div>
                    <strong>{quest.title}</strong>
                    {quest.description && (
                      <div className="muted" style={{ marginTop: 4 }}>{quest.description}</div>
                    )}
                    {quest.notes && (
                      <div className="chip-row" style={{ marginTop: 4 }}>
                        <span className="chip chip--warning">{quest.notes}</span>
                      </div>
                    )}
                  </div>
                  {completed ? (
                    <span className="chip chip--success task-status-chip">達成済み</span>
                  ) : hasTask ? (
                    <span className="chip chip--warning">進行中</span>
                  ) : (
                    <button className="btn btn--small" onClick={() => handleAddQuest(quest)}>
                      タスクに追加
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
