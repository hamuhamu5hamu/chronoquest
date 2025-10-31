import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type EquipmentSlot = "amulet" | "armor" | "trinket";

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ["amulet", "armor", "trinket"];

export type Equipment = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  slot: EquipmentSlot;
  price_coins: number;
  effect_type: "xp_percent" | "fatigue_step" | string;
  effect_value: number;
  active: boolean;
};

type EquippedRow = {
  slot: EquipmentSlot;
  equipment_id: string | null;
  equipments: Equipment | null;
};

export type EquippedMap = Record<EquipmentSlot, Equipment | null>;

export function useEquipment(userId: string | null | undefined) {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<EquippedMap>({
    amulet: null,
    armor: null,
    trinket: null,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const equipmentPromise = supabase
        .from("equipments")
        .select("*")
        .eq("active", true)
        .order("price_coins", { ascending: true });

      const ownedPromise = userId
        ? supabase
            .from("user_equipments")
            .select("equipment_id")
            .eq("user_id", userId)
        : Promise.resolve({ data: [] as { equipment_id: string }[], error: null });

      const slotPromise = userId
        ? supabase
            .from("user_equipment_slots")
            .select("slot,equipment_id,equipments(*)")
            .eq("user_id", userId)
        : Promise.resolve({ data: [] as EquippedRow[], error: null });

      const [
        { data: eqData, error: eqError },
        { data: ownedData, error: ownedError },
        { data: slotData, error: slotError },
      ] = await Promise.all([equipmentPromise, ownedPromise, slotPromise]);

      if (eqError) throw eqError;
      if (ownedError) throw ownedError;
      if (slotError) throw slotError;

      setEquipments((eqData ?? []) as Equipment[]);
      setOwnedIds(new Set((ownedData ?? []).map((row: any) => row.equipment_id)));

      const baseEquipped: EquippedMap = {
        amulet: null,
        armor: null,
        trinket: null,
      };
      (slotData ?? []).forEach((row: any) => {
        if (!row) return;
        const slot = row.slot as EquipmentSlot;
        if (!EQUIPMENT_SLOTS.includes(slot)) return;
        baseEquipped[slot] = (row.equipments ?? null) as Equipment | null;
      });
      setEquipped(baseEquipped);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const purchase = useCallback(
    async (equipmentId: string) => {
      if (!userId) throw new Error("not logged in");
      const { error: rpcError } = await supabase.rpc("purchase_equipment", {
        p_user_id: userId,
        p_equipment_id: equipmentId,
      });
      if (rpcError) throw rpcError;
      await fetchAll();
    },
    [userId, fetchAll]
  );

  const equip = useCallback(
    async (slot: EquipmentSlot, equipmentId: string) => {
      if (!userId) throw new Error("not logged in");
      const { error: rpcError } = await supabase.rpc("equip_equipment", {
        p_user_id: userId,
        p_slot: slot,
        p_equipment_id: equipmentId,
      });
      if (rpcError) throw rpcError;
      await fetchAll();
    },
    [userId, fetchAll]
  );

  const unequip = useCallback(
    async (slot: EquipmentSlot) => {
      if (!userId) throw new Error("not logged in");
      const { error: rpcError } = await supabase.rpc("unequip_equipment", {
        p_user_id: userId,
        p_slot: slot,
      });
      if (rpcError) throw rpcError;
      await fetchAll();
    },
    [userId, fetchAll]
  );

  const equippedList = useMemo(
    () =>
      EQUIPMENT_SLOTS.map((slot) => ({
        slot,
        equipment: equipped[slot],
      })),
    [equipped]
  );

  return {
    equipments,
    ownedIds,
    equipped,
    equippedList,
    loading,
    error,
    refetch: fetchAll,
    purchase,
    equip,
    unequip,
  };
}
