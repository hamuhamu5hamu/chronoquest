import type { ProfileStats } from "../hooks/useProfile";
import type { Task } from "../hooks/useTasks";

const CATEGORY_PRIMARY_STAT: Record<Task["category"], keyof ProfileStats> = {
  exercise: "str",
  study: "int",
  life: "will",
};

const BONUS_PER_POINT: Record<keyof ProfileStats, number> = {
  str: 0.05,
  int: 0.05,
  will: 0.04,
  cha: 0.03,
};

export const STAT_LABELS: Record<keyof ProfileStats, string> = {
  str: "体力",
  int: "知力",
  will: "意志力",
  cha: "魅力",
};

export const STAT_HINTS: Record<keyof ProfileStats, string> = {
  str: "運動クエストのXPボーナス",
  int: "勉強クエストのXPボーナス",
  will: "生活クエストのXPボーナス",
  cha: "社交・探索系ボーナス（今後実装予定）",
};

export const getPrimaryStatKey = (task: Task): keyof ProfileStats =>
  CATEGORY_PRIMARY_STAT[task.category];

export const getStatMultiplierForTask = (
  task: Task,
  stats: ProfileStats
): { multiplier: number; bonusPercent: number } => {
  const statKey = getPrimaryStatKey(task);
  const perPoint = BONUS_PER_POINT[statKey] ?? 0;
  const statValue = stats[statKey] ?? 0;
  const multiplier = 1 + statValue * perPoint;
  return { multiplier, bonusPercent: statValue * perPoint * 100 };
};

export const getBonusSummary = (stats: ProfileStats) =>
  (Object.keys(stats) as (keyof ProfileStats)[]).reduce<Record<string, number>>(
    (acc, key) => {
      acc[key] = Number((stats[key] ?? 0) * (BONUS_PER_POINT[key] ?? 0) * 100);
      return acc;
    },
    {}
  );
