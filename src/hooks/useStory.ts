import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type StoryChapter = {
  id: string;
  code: string;
  order_index: number;
  title: string;
  summary: string | null;
  logline: string | null;
  image_url: string | null;
  required_stat_key: "str" | "int" | "will" | "cha" | null;
  required_stat_value: number | null;
  required_streak: number | null;
  required_quest_code: string | null;
  reward_equipment_id: string | null;
};

export type StoryQuest = {
  id: string;
  code: string;
  chapter_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  task_category: "exercise" | "study" | "life" | null;
  effort_level: "light" | "standard" | "hard" | null;
  reward_coins: number;
  task_title: string | null;
  task_requires_count: boolean | null;
  task_target_count: number | null;
  task_unit: string | null;
  suggested_by_ai?: boolean | null;
};

export type UserChapterProgress = {
  user_id: string;
  chapter_id: string;
  unlocked_at: string;
};

export function useStory(userId: string | null | undefined) {
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [quests, setQuests] = useState<StoryQuest[]>([]);
  const [progress, setProgress] = useState<UserChapterProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: chapterData, error: chapterError }, { data: questData, error: questError }, progressResult] =
        await Promise.all([
          supabase
            .from("story_chapters")
            .select("id,code,order_index,title,summary,logline,image_url,required_stat_key,required_stat_value,required_streak,required_quest_code,reward_equipment_id")
            .order("order_index", { ascending: true }),
          supabase
            .from("story_quests")
            .select(
              "id,code,chapter_id,order_index,title,description,notes,task_category,effort_level,reward_coins,task_title,task_requires_count,task_target_count,task_unit,suggested_by_ai"
            )
            .order("order_index", { ascending: true }),
          userId
            ? supabase.from("user_story_progress").select("chapter_id,unlocked_at").eq("user_id", userId)
            : Promise.resolve({ data: [] as UserChapterProgress[], error: null }),
        ]);

      if (chapterError) throw chapterError;
      if (questError) throw questError;

      setChapters((chapterData ?? []) as StoryChapter[]);
      setQuests((questData ?? []) as StoryQuest[]);

      if (progressResult.error) throw progressResult.error;
      setProgress((progressResult.data ?? []) as UserChapterProgress[]);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const unlockedChapterIds = useMemo(
    () => new Set(progress.map((p) => p.chapter_id)),
    [progress]
  );

  const orderedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.order_index - b.order_index);
  }, [chapters]);

  const currentChapter = useMemo(() => {
    let lastUnlocked: StoryChapter | null = null;
    for (const chapter of orderedChapters) {
      if (unlockedChapterIds.has(chapter.id)) {
        lastUnlocked = chapter;
      } else {
        break;
      }
    }
    return lastUnlocked ?? orderedChapters[0] ?? null;
  }, [orderedChapters, unlockedChapterIds]);

  const nextChapter = useMemo(() => {
    for (const chapter of orderedChapters) {
      if (!unlockedChapterIds.has(chapter.id)) {
        return chapter;
      }
    }
    return null;
  }, [orderedChapters, unlockedChapterIds]);

  const questsByCode = useMemo(() => {
    const map = new Map<string, StoryQuest>();
    quests.forEach((q) => map.set(q.code, q));
    return map;
  }, [quests]);

  const unlockChapter = useCallback(
    async (chapterId: string) => {
      if (!userId) throw new Error("not logged in");
      const { error: rpcError } = await supabase.rpc("unlock_story_chapter", {
        p_user_id: userId,
        p_chapter_id: chapterId,
      });
      if (rpcError) throw rpcError;
      await fetchStory();
    },
    [userId, fetchStory]
  );

  return {
    chapters: orderedChapters,
    quests,
    questsByCode,
    progress,
    unlockedChapterIds,
    currentChapter,
    nextChapter,
    loading,
    error,
    refetch: fetchStory,
    unlockChapter,
  };
}
