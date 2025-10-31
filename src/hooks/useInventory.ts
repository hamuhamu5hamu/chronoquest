import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ShopItem } from "./useShop";

export type UserInventoryItem = ShopItem & {
  quantity: number;
};

type Row = { quantity: number; shop_items: ShopItem };

export function useInventory(userId: string | null | undefined) {
  const [items, setItems] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: selErr } = await supabase
        .from("user_shop_items")
        .select("quantity, shop_items(*)")
        .eq("user_id", userId);
      if (selErr) throw selErr;
      const rows = ((data ?? []) as unknown as Row[]) ?? [];
      const mapped = rows.map((row) => ({
        ...row.shop_items,
        quantity: row.quantity,
      }));
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const consume = useCallback(
    async (itemId: string, quantity = 1) => {
      if (!userId) throw new Error("not logged in");
      const { error } = await supabase.rpc("consume_shop_item", {
        p_user_id: userId,
        p_item_id: itemId,
        p_quantity: quantity,
      });
      if (error) throw error;
      await fetchItems();
    },
    [userId, fetchItems]
  );

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    consume,
  };
}
