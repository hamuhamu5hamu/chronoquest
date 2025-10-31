import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const noop = async () => {};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: noop,
});

export const useAuth = () => useContext(Ctx);

/**
 * ⚠️ プロフィール初期化はここでは行いません。
 * ここで upsert するとログインのたびに xp を上書きして消える原因になります。
 * 初回だけ作る必要がある場合は、別の場所で
 * 「存在チェックしてから insert（存在すれば何もしない）」で実装してください。
 */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 起動時のセッション取得
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    // セッション変化の購読（上書き系の DB 操作はしない）
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthCtx>(
    () => ({ session, user: session?.user ?? null, loading, signOut }),
    [session, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
