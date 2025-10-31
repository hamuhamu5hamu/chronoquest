// src/game/xp.ts

export const LEVEL_XP_BASE = 100;
export const XP_GROWTH_EXPONENT = 0.55; // Lv2: ~144, Lv3: ~180 など緩やかな増加

export function xpRequiredForLevel(level: number): number {
  const raw = LEVEL_XP_BASE * Math.pow(level, XP_GROWTH_EXPONENT);
  return Math.max(LEVEL_XP_BASE, Math.round(raw));
}

export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpRequiredForLevel(l);
  }
  return total;
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (true) {
    const needed = xpRequiredForLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }
  return level;
}

export function applyXpAndLevel(
  _currentLevel: number,
  currentXp: number,
  gainedXp: number
) {
  const nextXp = currentXp + gainedXp;
  const nextLevel = levelFromXp(nextXp);
  return { nextLevel, nextXp };
}

export function xpProgress(totalXp: number) {
  const level = levelFromXp(totalXp);
  const start = totalXpForLevel(level);
  const span = xpRequiredForLevel(level);
  const inLevel = totalXp - start;
  const remaining = span - inLevel;
  return { level, inLevel, span, remaining };
}

export function calcXpGain(baseXp: number, fatigueMul = 1): number {
  return Math.max(0, Math.round(baseXp * fatigueMul));
}

export const FATIGUE_TABLE = [1.0, 0.9, 0.85, 0.8, 0.75];

export function fatigueMultiplierForIndex(index: number): number {
  if (index < 0) return 1;
  if (index >= FATIGUE_TABLE.length)
    return FATIGUE_TABLE[FATIGUE_TABLE.length - 1];
  return FATIGUE_TABLE[index];
}
