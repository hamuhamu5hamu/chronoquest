import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile, getProfileStats } from "../hooks/useProfile";
import type { ProfileStats } from "../hooks/useProfile";
import { STAT_LABELS, STAT_HINTS } from "../game/stats";
import { useToast } from "../components/ui/ToastProvider";
import { useEquipment } from "../hooks/useEquipment";
import { useInventory } from "../hooks/useInventory";

export default function StatusPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const {
    profile,
    loading: profileLoading,
    allocateStat,
    refetch,
  } = useProfile(userId);
  const {
    equipments,
    ownedIds,
    equippedList,
    loading: equipmentLoading,
    equip,
    unequip,
  } = useEquipment(userId);
  const { items: inventoryItems, loading: inventoryLoading } = useInventory(userId);
  const { showToast } = useToast();
  const [allocatingKey, setAllocatingKey] = useState<keyof ProfileStats | null>(null);
  const [processingEquipId, setProcessingEquipId] = useState<string | null>(null);

  const stats = useMemo(() => getProfileStats(profile), [profile]);
  const unspent = profile?.unspent_points ?? 0;

  if (authLoading || profileLoading) {
    return (
      <section className="page">
        <div className="card">読み込み中...</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page">
        <div className="card">
          <h2>Status</h2>
          <p>ログインして冒険者情報を確認しましょう。</p>
        </div>
      </section>
    );
  }

  const handleAllocate = async (key: keyof ProfileStats) => {
    if (!allocateStat) return;
    try {
      setAllocatingKey(key);
      await allocateStat(key);
      await refetch();
      showToast(`${STAT_LABELS[key]} が1上昇！`, { variant: "success" });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      showToast(`ステータス割り振りに失敗しました: ${msg}`, { variant: "error" });
    } finally {
      setAllocatingKey(null);
    }
  };

  return (
    <section className="page">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>ステータス</h2>
          <span className="chip chip--success">残ポイント {unspent}</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          表示名や通知設定はヘッダー右上の⚙️から操作できます。
        </p>
        <ul className="list">
          {(Object.keys(stats) as (keyof ProfileStats)[]).map((key) => (
            <li className="list__item" key={key}>
              <div>
                <strong>{STAT_LABELS[key]}</strong>
                <div className="muted" style={{ marginTop: 4 }}>{STAT_HINTS[key]}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="chip" style={{ background: "rgba(84,214,161,0.16)" }}>
                  {stats[key]}
                </span>
                <button
                  className="btn btn--small"
                  disabled={unspent <= 0 || allocatingKey === key}
                  onClick={() => handleAllocate(key)}
                >
                  {allocatingKey === key ? "..." : "+1"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>装備</h2>
        {equipmentLoading ? (
          <div className="muted">読み込み中...</div>
        ) : equipments.length === 0 ? (
          <div className="muted">装備は準備中です。</div>
        ) : (
          <ul className="list">
            {equipments.map((gear) => {
              const owned = ownedIds.has(gear.id);
              const equippedSlot = equippedList.find(
                (slot) => slot.equipment?.id === gear.id
              );
              const isEquipped = Boolean(equippedSlot);
              const buttonDisabled = processingEquipId === gear.id;

              const handleEquipAction = async () => {
                if (!userId) {
                  showToast("ログインしてください", { variant: "error" });
                  return;
                }
                setProcessingEquipId(gear.id);
                try {
                  if (isEquipped) {
                    await unequip(gear.slot);
                    showToast(`${gear.name} を外しました`, { variant: "success" });
                  } else if (owned) {
                    await equip(gear.slot, gear.id);
                    showToast(`${gear.name} を装備しました`, { variant: "success" });
                  } else {
                    showToast("未所持の装備です。ショップで購入してください。");
                  }
                } catch (e: any) {
                  showToast(`装備操作に失敗しました: ${e?.message ?? e}`, {
                    variant: "error",
                  });
                } finally {
                  setProcessingEquipId(null);
                }
              };

              return (
                <li className={`list__item ${isEquipped ? "list__item--done" : ""}`} key={gear.id}>
                  <div>
                    <strong>{gear.name}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      スロット: {gear.slot} ・ {gear.effect_type} {gear.effect_value}
                    </div>
                    {gear.description && (
                      <div className="muted" style={{ marginTop: 4 }}>{gear.description}</div>
                    )}
                    <div className="chip-row" style={{ marginTop: 6 }}>
                      <span className="chip">{owned ? "所持" : "未所持"}</span>
                      {isEquipped && <span className="chip chip--success">装備中</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn--small"
                    onClick={handleEquipAction}
                    disabled={buttonDisabled || (!owned && !isEquipped)}
                  >
                    {buttonDisabled ? "処理中..." : isEquipped ? "外す" : owned ? "装備する" : "未所持"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>アイテム</h2>
        {inventoryLoading ? (
          <div className="muted">読み込み中...</div>
        ) : inventoryItems.length === 0 ? (
          <div className="muted">アイテムをまだ所持していません。</div>
        ) : (
          <ul className="list list--compact">
            {inventoryItems.map((item) => (
              <li className="list__item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted" style={{ marginTop: 4 }}>
                    効果: {item.effect_type} {item.effect_value}
                  </div>
                  {item.description && (
                    <div className="muted" style={{ marginTop: 4 }}>{item.description}</div>
                  )}
                </div>
                <span className="chip">所持数 {item.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
