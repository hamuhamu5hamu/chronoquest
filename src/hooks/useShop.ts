import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type ShopItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_coins: number;
  effect_type: string;
  effect_value: number;
  active: boolean;
};

type UserItemRow = { item_id: string; quantity: number };

export function useShop(userId: string | null | undefined) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const itemPromise = supabase
        .from("shop_items")
        .select("*")
        .eq("active", true)
        .order("price_coins", { ascending: true });
      const inventoryPromise = userId
        ? supabase
            .from("user_shop_items")
            .select("item_id, quantity")
            .eq("user_id", userId)
        : Promise.resolve({ data: [] as UserItemRow[], error: null });

      const [{ data: itemData, error: itemErr }, { data: inventoryData, error: inventoryErr }] =
        await Promise.all([itemPromise, inventoryPromise]);

      if (itemErr) throw itemErr;
      if (inventoryErr) throw inventoryErr;
      setItems((itemData ?? []) as ShopItem[]);
      const map = new Map<string, number>();
      (inventoryData ?? []).forEach((row) => {
        const { item_id, quantity } = row as UserItemRow;
        map.set(item_id, quantity ?? 0);
      });
      setInventory(map);
    } catch (e: any) {
      const message = e?.message ?? String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [userId, fetchAll]);

  const purchase = useCallback(
    async (itemId: string) => {
      if (!userId) throw new Error("not logged in");
      const { data, error: rpcError } = await supabase.rpc("purchase_shop_item", {
        p_user_id: userId,
        p_item_id: itemId,
      });
      if (rpcError) throw rpcError;
      await fetchAll();
      return data as { item_id: string; remaining_coins: number; quantity: number };
    },
    [userId, fetchAll]
  );

  const inventoryMap = useMemo(
    () => inventory,
    [inventory]
  );

  return {
    items,
    inventory: inventoryMap,
    loading,
    error,
    refetch: fetchAll,
    purchase,
  };
}
