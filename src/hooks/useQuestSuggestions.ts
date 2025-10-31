import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { StoryChapter } from "./useStory";

export type QuestSuggestion = {
  id: string;
  user_id: string;
  chapter_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  task_category: "exercise" | "study" | "life" | null;
  effort_level: "light" | "standard" | "hard" | null;
  created_at: string;
  accepted_at: string | null;
  dismissed_at: string | null;
  source: string | null;
};

const LOCAL_SUGGESTION_COUNT = 2;

const localPool = [
  {
    code: "ai-suggest-study-session",
    title: "図書館で集中タイム",
    description: "静かな環境で知力を磨こう",
    notes: "夕方18:00に30分間、参考書を使って要点暗記を実施",
    task_category: "study" as const,
    effort_level: "standard" as const,
  },
  {
    code: "ai-suggest-morning-run",
    title: "朝のスプリント",
    description: "体力を整えて冒険に備える",
    notes: "朝7時に10分のランニングとストレッチを行う",
    task_category: "exercise" as const,
    effort_level: "light" as const,
  },
  {
    code: "ai-suggest-life-reset",
    title: "生活拠点のリセット",
    description: "拠点を整備して気分転換",
    notes: "クローゼット整理と不要品リストアップを30分で完了",
    task_category: "life" as const,
    effort_level: "standard" as const,
  },
];

function generateLocalSuggestions(currentChapter: StoryChapter | null) {
  const seed = currentChapter?.code ?? "default";
  const pool = [...localPool].sort((a, b) => (a.code + seed).localeCompare(b.code + seed));
  return pool.slice(0, LOCAL_SUGGESTION_COUNT);
}

export function useQuestSuggestions(userId: string | null | undefined, currentChapter: StoryChapter | null) {
  const [suggestions, setSuggestions] = useState<QuestSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!userId) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: selErr } = await supabase
        .from("ai_quest_suggestions")
        .select("id,user_id,chapter_id,title,description,notes,task_category,effort_level,created_at,accepted_at,dismissed_at,source")
        .eq("user_id", userId)
        .is("accepted_at", null)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false });
      if (selErr) throw selErr;

      let rows = (data ?? []) as QuestSuggestion[];
      if (rows.length === 0) {
        const local = generateLocalSuggestions(currentChapter).map((item) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          chapter_id: currentChapter?.id ?? null,
          title: item.title,
          description: item.description,
          notes: item.notes,
          task_category: item.task_category,
          effort_level: item.effort_level,
          created_at: new Date().toISOString(),
          accepted_at: null,
          dismissed_at: null,
          source: "local",
        } satisfies QuestSuggestion));

        // 保存して再取得（Supabaseが利用可の場合）
        try {
          const inserts = local.map((suggestion) => ({
            user_id: suggestion.user_id,
            chapter_id: suggestion.chapter_id,
            title: suggestion.title,
            description: suggestion.description,
            notes: suggestion.notes,
            task_category: suggestion.task_category,
            effort_level: suggestion.effort_level,
            source: "local",
          }));
          if (inserts.length > 0) {
            await supabase.from("ai_quest_suggestions").insert(inserts);
            rows = local;
          }
        } catch (insertErr) {
          console.warn("[useQuestSuggestions] insert skipped", insertErr);
          rows = local;
        }
      }

      setSuggestions(rows);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [userId, currentChapter]);

  useEffect(() => {
    if (userId) fetchSuggestions();
    else {
      setSuggestions([]);
      setLoading(false);
      setError(null);
    }
  }, [userId, fetchSuggestions]);

  const acceptSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!userId) throw new Error("not logged in");
      await supabase
        .from("ai_quest_suggestions")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", suggestionId)
        .eq("user_id", userId);
      await fetchSuggestions();
    },
    [userId, fetchSuggestions]
  );

  const dismissSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!userId) throw new Error("not logged in");
      await supabase
        .from("ai_quest_suggestions")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", suggestionId)
        .eq("user_id", userId);
      await fetchSuggestions();
    },
    [userId, fetchSuggestions]
  );

  return {
    suggestions,
    loading,
    error,
    refetch: fetchSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  };
}
