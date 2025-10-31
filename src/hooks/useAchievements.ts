import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "first_completion" | "total_completions" | "category_total_completions" | string;
  threshold: number | null;
  category: "exercise" | "study" | "life" | null;
  icon: string | null;
  active: boolean;
  created_at: string;
};

export type AchievementWithState = Achievement & {
  unlocked: boolean;
  unlocked_at: string | null;
};

export function useAchievements(userId: string | null | undefined) {
  const [achievements, setAchievements] = useState<AchievementWithState[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (): Promise<AchievementWithState[]> => {
    if (!userId) {
      setAchievements([]);
      setLoading(false);
      setError(null);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const [{ data: achData, error: achError }, { data: userData, error: userError }] =
        await Promise.all([
          supabase
            .from("achievements")
            .select("*")
            .eq("active", true)
            .order("created_at", { ascending: true }),
          supabase
            .from("user_achievements")
            .select("achievement_id, unlocked_at")
            .eq("user_id", userId)
            .order("unlocked_at", { ascending: true }),
        ]);

      if (achError) throw achError;
      if (userError) throw userError;

      const unlockedMap = new Map<string, string>();
      (userData ?? []).forEach((ua: { achievement_id: string; unlocked_at: string }) => {
        unlockedMap.set(ua.achievement_id, ua.unlocked_at);
      });

      const merged = (achData ?? []).map((a: Achievement) => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlocked_at: unlockedMap.get(a.id) ?? null,
      }));

      setAchievements(merged);
      return merged;
    } catch (e: any) {
      const message = e?.message ?? String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setAchievements([]);
    if (userId) {
      fetchAll().catch((err) => {
        console.error("[useAchievements.fetchAll]", err);
      });
    } else {
      setLoading(false);
    }
  }, [userId, fetchAll]);

  const unlocked = useMemo(
    () => achievements.filter((a) => a.unlocked),
    [achievements]
  );

  const locked = useMemo(
    () => achievements.filter((a) => !a.unlocked),
    [achievements]
  );

  return {
    achievements,
    unlocked,
    locked,
    loading,
    error,
    refetch: fetchAll,
  };
}
