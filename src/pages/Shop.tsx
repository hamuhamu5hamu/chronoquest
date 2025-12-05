import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../hooks/useProfile";
import { useShop } from "../hooks/useShop";
import { useEquipment } from "../hooks/useEquipment";
import { useToast } from "../components/ui/ToastProvider";

const EFFECT_LABELS: Record<string, string> = {
  xp_boost: "XPブースト",
  fatigue_reduce: "疲労軽減",
};

const EQUIPMENT_EFFECT_LABELS: Record<string, string> = {
  xp_percent: "XPブースト%",
  fatigue_step: "疲労段階軽減",
};

const SLOT_LABELS: Record<string, string> = {
  amulet: "アクセサリ",
  armor: "防具",
  trinket: "護符",
};

export default function Shop() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile, refetch } = useProfile();
  const { items, inventory, loading, error, purchase } = useShop(userId);
  const {
    equipments,
    ownedIds: ownedEquipmentIds,
    equippedList,
    loading: equipmentLoading,
    error: equipmentError,
    purchase: purchaseEquipment,
    equip,
    unequip,
  } = useEquipment(userId);
  const { showToast } = useToast();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [processingEquipmentId, setProcessingEquipmentId] = useState<string | null>(null);
  const coins = profile?.coins ?? 0;

  const handleBuy = async (itemId: string, price: number) => {
    if (!userId) {
      showToast("購入するにはログインしてください", { variant: "error" });
      return;
    }
    if (coins < price) {
      showToast("コインが足りません", { variant: "error" });
      return;
    }
    setBuyingId(itemId);
    try {
      await purchase(itemId);
      await refetch();
      showToast("購入しました！", { variant: "success" });
    } catch (e: any) {
      const message = e?.message ?? String(e);
      showToast(`購入に失敗しました: ${message}`, { variant: "error" });
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <section className="page">
      <div className="card">
        <h2>Shop</h2>
        <div className="muted">所持コイン: {coins}</div>
        {loading ? (
          <div className="muted" style={{ marginTop: 12 }}>
            読み込み中...
          </div>
        ) : error ? (
          <div className="muted" style={{ marginTop: 12 }}>
            読み込みに失敗しました: {error}
          </div>
        ) : items.length === 0 ? (
          <div className="muted" style={{ marginTop: 12 }}>
            商品が準備中です。
          </div>
        ) : (
          <ul className="list" style={{ marginTop: 12 }}>
            {items.map((item) => {
              const owned = inventory.get(item.id) ?? 0;
              const effectLabel = EFFECT_LABELS[item.effect_type] ?? item.effect_type;
              return (
                <li className="list__item" key={item.id}>
                  <div>
                    <b>{item.name}</b>
                    <div className="muted">
                      {effectLabel} ・ 効果値 {item.effect_value}
                    </div>
                    {item.description && (
                      <div className="muted" style={{ marginTop: 4 }}>
                        {item.description}
                      </div>
                    )}
                    {owned > 0 && (
                      <div className="muted" style={{ marginTop: 4 }}>
                        所持数: {owned}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn"
                    disabled={buyingId === item.id || coins < item.price_coins}
                    onClick={() => handleBuy(item.id, item.price_coins)}
                    style={{ minWidth: 96 }}
                  >
                    {coins < item.price_coins
                      ? `${item.price_coins}c`
                      : buyingId === item.id
                      ? "処理中..."
                      : `${item.price_coins}cで購入`}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Equipment</h2>
        {equipmentLoading ? (
          <div className="muted" style={{ marginTop: 12 }}>
            読み込み中...
          </div>
        ) : equipmentError ? (
          <div className="muted" style={{ marginTop: 12 }}>
            読み込みに失敗しました: {equipmentError}
          </div>
        ) : equipments.length === 0 ? (
          <div className="muted" style={{ marginTop: 12 }}>
            装備は準備中です。
          </div>
        ) : (
          <ul className="list" style={{ marginTop: 12 }}>
            {equipments.map((gear) => {
              const owned = ownedEquipmentIds.has(gear.id);
              const equippedInfo = equippedList.find((slot) => slot.equipment?.id === gear.id);
              const isEquipped = Boolean(equippedInfo);
              const slotLabel = SLOT_LABELS[gear.slot] ?? gear.slot;
              const effectLabel = EQUIPMENT_EFFECT_LABELS[gear.effect_type] ?? gear.effect_type;
              const buttonDisabled = processingEquipmentId === gear.id;

              const handlePurchaseEquipment = async () => {
                if (!userId) {
                  showToast("購入するにはログインしてください", { variant: "error" });
                  return;
                }
                if (coins < gear.price_coins) {
                  showToast("コインが足りません", { variant: "error" });
                  return;
                }
                setProcessingEquipmentId(gear.id);
                try {
                  await purchaseEquipment(gear.id);
                  await refetch();
                  showToast("装備を購入しました！", { variant: "success" });
                } catch (e: any) {
                  const message = e?.message ?? String(e);
                  showToast(`購入に失敗しました: ${message}`, { variant: "error" });
                } finally {
                  setProcessingEquipmentId(null);
                }
              };

              const handleEquip = async () => {
                setProcessingEquipmentId(gear.id);
                try {
                  await equip(gear.slot, gear.id);
                  showToast(`${gear.name} を装備しました`, { variant: "success" });
                } catch (e: any) {
                  const message = e?.message ?? String(e);
                  showToast(`装備に失敗しました: ${message}`, { variant: "error" });
                } finally {
                  setProcessingEquipmentId(null);
                }
              };

              const handleUnequip = async () => {
                setProcessingEquipmentId(gear.id);
                try {
                  await unequip(gear.slot);
                  showToast(`${gear.name} を外しました`, { variant: "success" });
                } catch (e: any) {
                  const message = e?.message ?? String(e);
                  showToast(`装備解除に失敗しました: ${message}`, { variant: "error" });
                } finally {
                  setProcessingEquipmentId(null);
                }
              };

              return (
                <li className="list__item" key={gear.id}>
                  <div>
                    <b>{gear.name}</b>
                    <div className="muted">
                      スロット: {slotLabel} ・ {effectLabel} {gear.effect_value}
                    </div>
                    {gear.description && (
                      <div className="muted" style={{ marginTop: 4 }}>
                        {gear.description}
                      </div>
                    )}
                    {isEquipped && (
                      <div className="muted" style={{ marginTop: 4 }}>
                        装備中（{slotLabel}）
                      </div>
                    )}
                  </div>
                  {!owned ? (
                    <button
                      className="btn"
                      disabled={buttonDisabled || coins < gear.price_coins}
                      onClick={handlePurchaseEquipment}
                      style={{ minWidth: 120 }}
                    >
                      {coins < gear.price_coins
                        ? `${gear.price_coins}c`
                        : buttonDisabled
                        ? "処理中..."
                        : `${gear.price_coins}cで購入`}
                    </button>
                  ) : isEquipped ? (
                    <button
                      className="btn"
                      disabled={buttonDisabled}
                      onClick={handleUnequip}
                      style={{ minWidth: 120 }}
                    >
                      {buttonDisabled ? "処理中..." : "外す"}
                    </button>
                  ) : (
                    <button
                      className="btn"
                      disabled={buttonDisabled}
                      onClick={handleEquip}
                      style={{ minWidth: 120 }}
                    >
                      {buttonDisabled ? "処理中..." : "装備する"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
