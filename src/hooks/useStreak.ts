import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type UserStreak = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
};

const emptyStreak = (userId: string): UserStreak => ({
  user_id: userId,
  current_streak: 0,
  longest_streak: 0,
  last_completed_date: null,
});

export function useStreak(userId: string | null | undefined) {
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);
  const [loggedToday, setLoggedToday] = useState<boolean>(false);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);

  const fetchStreak = useCallback(async () => {
    if (!userId) {
      setStreak(null);
      setLoading(false);
      setError(null);
      setLoggedToday(false);
      setLastLoginAt(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: selError } = await supabase
        .from("user_streaks")
        .select("*, logged_today, last_login_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (selError) throw selError;
      const row = (data as (UserStreak & { logged_today?: boolean; last_login_at?: string }) | null) ?? emptyStreak(userId);
      setStreak(row);
      setLoggedToday(Boolean((data as any)?.logged_today));
      setLastLoginAt((data as any)?.last_login_at ?? null);
      return row;
    } catch (e: any) {
      const message = e?.message ?? String(e);
      setError(message);
      setLoggedToday(false);
      setLastLoginAt(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setStreak(null);
    if (userId) {
      fetchStreak();
    } else {
      setLoading(false);
    }
  }, [userId, fetchStreak]);

  return {
    streak,
    loading,
    error,
    refetch: fetchStreak,
    loggedToday,
    lastLoginAt,
  };
}
