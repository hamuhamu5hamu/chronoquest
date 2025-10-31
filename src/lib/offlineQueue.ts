export type OfflineOperation =
  | {
      type: "complete-task";
      userId: string;
      taskId: string;
      createdAt: string;
    }
  | {
      type: "set-counter";
      userId: string;
      taskId: string;
      count: number;
      countedOn: string;
      createdAt: string;
    };

const STORAGE_KEY = "cq_offline_queue_v1";

const loadQueue = (): OfflineOperation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OfflineOperation[];
  } catch (_e) {
    return [];
  }
};

const persistQueue = (queue: OfflineOperation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn("[offlineQueue.persistQueue] failed", e);
  }
};

export const offlineQueueStore = {
  load: loadQueue,
  save: persistQueue,
  clear() {
    persistQueue([]);
  },
};
