import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type DailyRewardState = {
  user_id: string;
  last_claimed_at: string | null;
  coins_awarded: number;
  streak_awarded: number;
};

export function useDailyReward(userId: string | null | undefined) {
  const [state, setState] = useState<DailyRewardState | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!userId) {
      setState(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: selErr } = await supabase
        .from("user_daily_rewards")
        .select("user_id,last_claimed_at,coins_awarded,streak_awarded")
        .eq("user_id", userId)
        .maybeSingle();
      if (selErr) throw selErr;
      setState((data as DailyRewardState | null) ?? null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchState();
    else {
      setState(null);
      setLoading(false);
      setError(null);
    }
  }, [userId, fetchState]);

  const claim = useCallback(async () => {
    if (!userId) throw new Error("not logged in");
    const { data, error: rpcError } = await supabase.rpc("claim_daily_reward");
    if (rpcError) throw rpcError;
    await fetchState();
    return data as { coins: number; streak_award: number } | null;
  }, [userId, fetchState]);

  return {
    state,
    loading,
    error,
    refetch: fetchState,
    claim,
  };
}
