import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/** タスク型（DBスキーマ準拠） */
export type Task = {
  id: string;
  user_id: string;
  title: string;
  category: "exercise" | "study" | "life";
  base_xp: number;
  effort_level?: "light" | "standard" | "hard" | null;
  repeat_type?: "once" | "daily" | "weekly";
  weekly_days?: string[] | null;
  due_date?: string | null;
  requires_count?: boolean;
  target_count?: number | null;
  unit?: string | null;
  story_quest_code?: string | null;
  notes?: string | null;
  created_at?: string;
};

/** 追加時の入力型 */
type NewTask = {
  title: string;
  category: Task["category"];
  base_xp?: number;
  effort_level?: Task["effort_level"];
  repeat_type?: Task["repeat_type"];
  weekly_days?: string[] | null;
  due_date?: string | null;
  requires_count?: boolean;
  target_count?: number | null;
  unit?: string | null;
  story_quest_code?: string | null;
  notes?: string | null;
};

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const storageKey = userId ? `cq_tasks_${userId}` : null;

  const persist = useCallback(
    (list: Task[]) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch (e) {
        console.warn("[useTasks.persist] failed", e);
      }
    },
    [storageKey]
  );

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id,user_id,title,category,base_xp,effort_level,repeat_type,weekly_days,due_date,requires_count,target_count,unit,story_quest_code,notes,created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const result = (data ?? []) as Task[];
      setTasks(result);
      persist(result);
    } catch (e: any) {
      console.error("[useTasks.fetchTasks]", e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [persist, userId]);

  const addTask = useCallback(
    async (input: NewTask) => {
      if (!userId) throw new Error("not logged in");

      const row = {
        user_id: userId,
        title: input.title,
        category: input.category,
        base_xp: input.base_xp ?? 10,
        effort_level: input.effort_level ?? "standard",
        repeat_type: input.repeat_type ?? "once",
        weekly_days:
          (input.repeat_type ?? "once") === "weekly" ? input.weekly_days ?? [] : null,
        due_date: input.due_date ?? null,
        requires_count: !!input.requires_count,
        target_count: input.requires_count ? input.target_count ?? 1 : null,
        unit: input.requires_count ? input.unit ?? "回" : null,
        story_quest_code: input.story_quest_code ?? null,
        notes: input.notes ?? null,
      };

      const { error } = await supabase.from("tasks").insert(row);
      if (error) throw error;
      await fetchTasks();
    },
    [userId, fetchTasks]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      if (!userId) throw new Error("not logged in");
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", userId);
      if (error) throw error;
      await fetchTasks();
    },
    [userId, fetchTasks]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      if (!userId) throw new Error("not logged in");
      const { error } = await supabase
        .from("task_completions")
        .insert({ user_id: userId, task_id: taskId });
      if (error) throw error;
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      return;
    }
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Task[];
          setTasks(parsed);
        }
      } catch (e) {
        console.warn("[useTasks.loadLocal] failed", e);
      }
    }
    fetchTasks();
  }, [fetchTasks, storageKey, userId]);

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    addTask,
    removeTask,
    completeTask,
  };
}
