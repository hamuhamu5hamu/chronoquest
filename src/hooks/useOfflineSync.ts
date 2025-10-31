import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { offlineQueueStore, type OfflineOperation } from "../lib/offlineQueue";
import { todayUTCDateString } from "./useDailyCounters";

type Options = {
  onSynced?: () => Promise<void> | void;
};

const isNetworkError = (error: unknown) => {
  if (!error) return false;
  const msg = typeof error === "string" ? error : (error as any)?.message;
  return (
    !navigator.onLine ||
    (typeof msg === "string" &&
      (msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("fetch") ||
        msg.includes("network")))
  );
};

export function useOfflineSync(userId: string | null, options?: Options) {
  const [queue, setQueue] = useState<OfflineOperation[]>(() =>
    offlineQueueStore.load()
  );
  const [syncing, setSyncing] = useState(false);

  const updateQueue = useCallback((updater: (prev: OfflineOperation[]) => OfflineOperation[]) => {
    setQueue((prev) => {
      const next = updater(prev);
      offlineQueueStore.save(next);
      return next;
    });
  }, []);

  const enqueueCompletion = useCallback(
    (taskId: string) => {
      if (!userId) return;
      updateQueue((prev) => [
        ...prev,
        {
          type: "complete-task",
          userId,
          taskId,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [updateQueue, userId]
  );

  const enqueueCounter = useCallback(
    (taskId: string, count: number) => {
      if (!userId) return;
      updateQueue((prev) => [
        ...prev,
        {
          type: "set-counter",
          userId,
          taskId,
          count,
          countedOn: todayUTCDateString(),
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [updateQueue, userId]
  );

  const flushQueue = useCallback(async () => {
    if (!userId || !navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const snapshot = offlineQueueStore.load();
      const remaining: OfflineOperation[] = [];
      let processed = false;
      for (const op of snapshot) {
        if (op.userId !== userId) {
          remaining.push(op);
          continue;
        }
        try {
          if (op.type === "complete-task") {
            const { error } = await supabase
              .from("task_completions")
              .insert([{ user_id: op.userId, task_id: op.taskId }]);
            if (error) throw error;
          } else if (op.type === "set-counter") {
            const { error } = await supabase.from("task_daily_counters").upsert(
              {
                user_id: op.userId,
                task_id: op.taskId,
                counted_on: op.countedOn,
                count: op.count,
              },
              { onConflict: "user_id,task_id,counted_on" }
            );
            if (error) throw error;
          }
          processed = true;
        } catch (err) {
          if (isNetworkError(err)) {
            remaining.push(op);
            break;
          }
          console.error("[offlineSync.flushQueue] failed op", err, op);
          remaining.push(op);
        }
      }
      offlineQueueStore.save(remaining);
      setQueue(remaining);
      if (processed) {
        await options?.onSynced?.();
      }
    } finally {
      setSyncing(false);
    }
  }, [options, syncing, userId]);

  useEffect(() => {
    if (!userId) return;
    const handle = () => flushQueue();
    window.addEventListener("online", handle);
    flushQueue();
    return () => {
      window.removeEventListener("online", handle);
    };
  }, [flushQueue, userId]);

  const userQueue = useMemo(
    () => queue.filter((op) => op.userId === userId),
    [queue, userId]
  );

  return {
    queue: userQueue,
    enqueueCompletion,
    enqueueCounter,
    flushQueue,
    syncing,
  };
}
