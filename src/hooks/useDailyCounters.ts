// src/hooks/useDailyCounters.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type DailyCounter = {
  task_id: string;
  count: number;
};

export const todayUTCDateString = () => {
  const d = new Date();
  // 0時化して UTC 日付文字列
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
};

export function useDailyCounters(userId: string | null) {
  const [map, setMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const storageKey = userId ? `cq_counts_${userId}` : null;

  const persist = useCallback(
    (next: Map<string, number>) => {
      if (!storageKey) return;
      try {
        const obj: Record<string, number> = {};
        next.forEach((value, key) => {
          obj[key] = value;
        });
        localStorage.setItem(storageKey, JSON.stringify(obj));
      } catch (e) {
        console.warn("[useDailyCounters.persist] failed", e);
      }
    },
    [storageKey]
  );

  useEffect(() => {
    if (!storageKey) {
      setMap(new Map());
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        setMap(new Map(Object.entries(parsed)));
      }
    } catch (e) {
      console.warn("[useDailyCounters.loadLocal] failed", e);
    }
  }, [storageKey]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const counted_on = todayUTCDateString();
      const { data, error } = await supabase
        .from("task_daily_counters")
        .select("task_id,count")
        .eq("user_id", userId)
        .eq("counted_on", counted_on);
      if (error) throw error;
      const m = new Map<string, number>();
      (data ?? []).forEach((r: any) => m.set(r.task_id, r.count));
      setMap(m);
      persist(m);
    } finally {
      setLoading(false);
    }
  }, [persist, userId]);

  const setCount = useCallback(
    async (taskId: string, next: number) => {
      if (!userId) return;
      const counted_on = todayUTCDateString();
      // upsert(一意キー: user_id, task_id, counted_on)
      const { error } = await supabase.from("task_daily_counters").upsert(
        {
          user_id: userId,
          task_id: taskId,
          counted_on,
          count: next,
        },
        { onConflict: "user_id,task_id,counted_on" }
      );
      if (error) throw error;
      // ローカル更新
      setMap((prev) => {
        const nextMap = new Map(prev).set(taskId, next);
        persist(nextMap);
        return nextMap;
      });
    },
    [persist, userId]
  );

  const setLocal = useCallback(
    (taskId: string, next: number) => {
      setMap((prev) => {
        const nextMap = new Map(prev).set(taskId, next);
        persist(nextMap);
        return nextMap;
      });
    },
    [persist]
  );

  useEffect(() => {
    setMap((prev) => {
      if (prev.size === 0 || !storageKey) return prev;
      return prev;
    });
    if (userId) load();
  }, [load, storageKey, userId]);

  return {
    loading,
    counts: map,              // Map<taskId, number>
    get: (taskId: string) => map.get(taskId) ?? 0,
    setCount,
    setLocal,
    reload: load,
  };
}
