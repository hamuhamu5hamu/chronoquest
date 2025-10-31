import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../hooks/useProfile";
import { useToast } from "../components/ui/ToastProvider";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading, updateDisplayName, refetch } = useProfile(userId);
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  if (authLoading || profileLoading) {
    return (
      <section className="page">
        <div className="card">読み込み中...</div>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="page">
        <div className="card">
          <h2>設定</h2>
          <p>ログインするとアカウント設定を変更できます。</p>
        </div>
      </section>
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("表示名を入力してください。", { variant: "error" });
      return;
    }
    try {
      setSaving(true);
      await updateDisplayName?.(displayName);
      await refetch();
      showToast("表示名を更新しました。", { variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(`更新に失敗しました: ${message}`, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="card" style={{ display: "grid", gap: 20 }}>
        <div>
          <h2>設定</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            表示名の変更や、今後追加される通知設定をここで管理します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="stack" style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="muted">表示名</div>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="冒険者名を入力"
              maxLength={40}
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
