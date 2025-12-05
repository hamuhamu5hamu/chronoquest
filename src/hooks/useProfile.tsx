// src/hooks/useProfile.ts
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { levelFromXp } from "../game/xp";

export type Profile = {
  id: string;
  level: number | null;
  xp: number | null;
  unspent_points: number | null;
  stats_json: any | null;
  coins: number | null;
  display_name: string | null;
  created_at?: string;
};

export type ProfileStats = {
  str: number;
  int: number;
  will: number;
  cha: number;
};

const defaultStats: ProfileStats = { str: 0, int: 0, will: 0, cha: 0 };

const createDefaultDisplayName = (uid: string) => {
  const suffix = uid.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `冒険者${suffix}`;
};

export const normalizeStats = (stats: any | null | undefined): ProfileStats => {
  if (!stats || typeof stats !== "object") return { ...defaultStats };
  const out: ProfileStats = { ...defaultStats };
  (Object.keys(out) as (keyof ProfileStats)[]).forEach((key) => {
    const raw = stats[key];
    out[key] = Number.isFinite(raw) ? Number(raw) : 0;
  });
  return out;
};

function useProfileState(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string>("");

  const syncLevelIfNeeded = useCallback(
    async (row: Profile | null) => {
      if (!userId || !row) return row;
      const xp = row.xp ?? 0;
      const currentLevel = row.level ?? 1;
      const calculatedLevel = levelFromXp(xp);
      if (calculatedLevel <= currentLevel) {
        return row;
      }

      const levelDelta = calculatedLevel - currentLevel;
      const { data, error: updErr } = await supabase
        .from("profiles")
        .update({
          level: calculatedLevel,
          unspent_points: (row.unspent_points ?? 0) + levelDelta,
        })
        .eq("id", userId)
        .select("*")
        .single();

      if (updErr) {
        console.error("[useProfile] syncLevelIfNeeded update error", updErr);
        return row;
      }

      return (data as Profile) ?? row;
    },
    [userId]
  );

  const fetchOnce = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");

    try {
      // 1) まず取得
      const { data: rows, error: selErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1);

      if (selErr) throw selErr;

      if (rows && rows.length > 0) {
        // 既存があればそれを使う（絶対に初期値で上書きしない）
        const synced = await syncLevelIfNeeded(rows[0] as Profile);
        setProfile(synced);
        return;
      }

      // 2) なければ「作成を試みる」(既存行があっても何もしない)
      //    ← ここが重要：on conflict do nothing に相当
      const { error: insErr } = await supabase.from("profiles").insert({
        id: userId,
        level: 1,
        xp: 0,
        unspent_points: 0,
        stats_json: { str: 0, int: 0, will: 0, cha: 0 },
        coins: 0,
        display_name: createDefaultDisplayName(userId),
      } as Partial<Profile>);

      // RLS の都合などで失敗しても、あとで再取得すれば OK なので throw しない
      if (insErr && insErr.code !== "23505" && insErr.code !== "409") {
        // 23505 = unique violation（誰か/何かが先に作成してた）
        console.warn("[profiles insert skipped]", insErr);
      }

      // 3) 再取得（この時点で必ず1行あるはず）
      const { data: rows2, error: selErr2 } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1);

      if (selErr2) throw selErr2;
      const synced = await syncLevelIfNeeded((rows2?.[0] ?? null) as Profile | null);
      setProfile(synced ?? null);
    } catch (e: any) {
      console.error("[useProfile] fetchOnce", e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [userId, syncLevelIfNeeded]);

  useEffect(() => {
    setProfile(null);
    if (userId) fetchOnce();
  }, [userId, fetchOnce]);

  // 手動で最新化したい時用
  const refetch = useCallback(async () => {
    if (!userId) return;
    const { data, error: selErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1);
    if (!selErr && data && data.length > 0) {
      const synced = await syncLevelIfNeeded(data[0] as Profile);
      setProfile(synced);
    }
  }, [userId, syncLevelIfNeeded]);

  const allocateStat = useCallback(
    async (statKey: keyof ProfileStats) => {
      if (!userId) throw new Error("not logged in");
      if (!profile) throw new Error("profile not loaded");
      const points = profile.unspent_points ?? 0;
      if (points <= 0) throw new Error("ポイントが足りません");

      const stats = normalizeStats(profile.stats_json);
      const nextStats = { ...stats, [statKey]: stats[statKey] + 1 };

      const { data, error: updErr } = await supabase
        .from("profiles")
        .update({
          stats_json: nextStats,
          unspent_points: points - 1,
        })
        .eq("id", userId)
        .eq("unspent_points", points)
        .select("*")
        .single();

      if (updErr) {
        throw updErr;
      }

      const synced = await syncLevelIfNeeded((data as Profile) ?? null);
      setProfile(synced);
      return synced;
    },
    [userId, profile, syncLevelIfNeeded]
  );

  const addXp = useCallback(
    async (amount: number) => {
      if (!userId) throw new Error("not logged in");
      if (!Number.isFinite(amount) || amount <= 0) return profile;
      console.debug("[useProfile.addXp] start", { userId, amount });
      const { data: current, error: curErr } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", userId)
        .maybeSingle();
      if (curErr) {
        throw curErr;
      }
      const baseXp = (current?.xp ?? profile?.xp ?? 0) as number;
      const { data, error: updErr } = await supabase
        .from("profiles")
        .update({ xp: baseXp + amount })
        .eq("id", userId)
        .select("*")
        .single();
      if (updErr) {
        throw updErr;
      }
      const synced = await syncLevelIfNeeded((data as Profile) ?? null);
      setProfile(synced);
      console.debug("[useProfile.addXp] updating profile via refetch", { userId });
      await refetch();
      console.debug("[useProfile.addXp] completed refetch", { userId });
      return synced;
    },
    [userId, profile, syncLevelIfNeeded, refetch]
  );

  const addCoins = useCallback(
    async (amount: number) => {
      if (!userId) throw new Error("not logged in");
      if (!Number.isFinite(amount) || amount <= 0) return profile;
      console.debug("[useProfile.addCoins] start", { userId, amount });
      const { data: current, error: curErr } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", userId)
        .maybeSingle();
      if (curErr) {
        throw curErr;
      }
      const baseCoins = (current?.coins ?? profile?.coins ?? 0) as number;
      const { data, error: updErr } = await supabase
        .from("profiles")
        .update({ coins: baseCoins + amount })
        .eq("id", userId)
        .select("*")
        .single();
      if (updErr) {
        throw updErr;
      }
      const synced = await syncLevelIfNeeded((data as Profile) ?? null);
      setProfile(synced);
      console.debug("[useProfile.addCoins] updating profile via refetch", { userId });
      await refetch();
      console.debug("[useProfile.addCoins] completed refetch", { userId });
      return synced;
    },
    [userId, profile, syncLevelIfNeeded, refetch]
  );

  const updateDisplayName = useCallback(
    async (nextName: string) => {
      if (!userId) throw new Error("not logged in");
      const trimmed = nextName.trim();
      if (!trimmed) throw new Error("表示名を入力してください");
      const { data, error: updErr } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", userId)
        .select("*")
        .single();
      if (updErr) throw updErr;
      const synced = await syncLevelIfNeeded((data as Profile) ?? null);
      setProfile(synced);
      return synced;
    },
    [userId, syncLevelIfNeeded]
  );

  const updateLocalProfile = useCallback(
    (updater: (prev: Profile | null) => Profile | null) => {
      setProfile((prev) => updater(prev));
    },
    []
  );

  return {
    profile,
    loading,
    error,
    refetch,
    allocateStat,
    addXp,
    addCoins,
    updateDisplayName,
  };
  return {
    profile,
    loading,
    error,
    refetch,
    allocateStat,
    addXp,
    addCoins,
    updateDisplayName,
    updateLocalProfile,
  };
}

type ProfileContextValue = ReturnType<typeof useProfileState> & { userId: string | null };

const ProfileContext = createContext<ProfileContextValue | null>(null);

type ProfileProviderProps = {
  userId: string | null;
  children: ReactNode;
};

export function ProfileProvider({ userId, children }: ProfileProviderProps) {
  const state = useProfileState(userId);
  const value = useMemo<ProfileContextValue>(() => ({ ...state, userId }), [state, userId]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}

export const getProfileStats = (profile: Profile | null | undefined): ProfileStats =>
  normalizeStats(profile?.stats_json);
