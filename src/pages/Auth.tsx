import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const loc = useLocation() as { state?: { from?: Location } };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(mode === "signup" ? "登録処理中..." : "ログイン処理中...");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // ← ここでは profiles の upsert はしない（ログイン後に実行）
        setMessage("確認メールを送信しました。メール内リンクで登録を完了してください📩");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("ログイン成功！🎉");
        const to = (loc.state?.from as any)?.pathname ?? "/";
        navigate(to, { replace: true });
      }
    } catch (err: any) {
      setMessage(`エラー: ${err.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <div className="card">
        <h2>{mode === "signup" ? "サインアップ" : "ログイン"}</h2>
        <form className="form" onSubmit={handleAuth}>
          <label>
            メール
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "処理中..." : mode === "signup" ? "登録" : "ログイン"}
          </button>
        </form>

        <div className="muted" style={{ marginTop: 12 }}>
          {mode === "signup" ? (
            <button className="link" onClick={() => setMode("login")} disabled={loading}>
              既にアカウントがあります → ログイン
            </button>
          ) : (
            <button className="link" onClick={() => setMode("signup")} disabled={loading}>
              新規登録はこちら
            </button>
          )}
        </div>

        {message && <p style={{ marginTop: 16 }}>{message}</p>}
      </div>
    </section>
  );
}
