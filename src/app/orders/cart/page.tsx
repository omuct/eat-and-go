"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { Plus, Minus, Trash2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface CartItem {
  id: string;
  food_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  size: "regular" | "large";
  is_takeout: boolean;
  total_price: number;
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [groupedByStore, setGroupedByStore] = useState<
    Record<string, CartItem[]>
  >({});

  const dedupeCartIfNeeded = async (
    items: CartItem[],
    userId: string
  ): Promise<boolean> => {
    try {
      const groups: Record<string, CartItem[]> = {};
      for (const it of items) {
        const key = `${it.food_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(it);
      }

      let changed = false;
      for (const key of Object.keys(groups)) {
        const group = groups[key];
        if (group.length <= 1) continue;
        changed = true;

        const [keeper, ...dups] = group;
        const sumQty = group.reduce((s, it) => s + (it.quantity || 0), 0);
        const unitPrice = keeper.price;
        const newTotal = unitPrice * sumQty;
        const { error: upErr } = await supabase
          .from("cart")
          .update({ quantity: sumQty, total_price: newTotal })
          .eq("id", keeper.id)
          .eq("user_id", userId);
        if (upErr) throw upErr;

        const delIds = dups.map((d) => d.id);
        const { error: delErr } = await supabase
          .from("cart")
          .delete()
          .in("id", delIds)
          .eq("user_id", userId);
        if (delErr) throw delErr;
      }

      return changed;
    } catch (e) {
      console.error("カート重複解消エラー:", e);
      return false;
    }
  };

  const regroupFromItems = async (items: CartItem[]) => {
    try {
      const foodIds = Array.from(new Set(items.map((i) => i.food_id)));
      let storeMap: Record<string, string> = {};
      if (foodIds.length > 0) {
        const { data: foods, error: foodsError } = await supabase
          .from("foods")
          .select("id, store_name")
          .in("id", foodIds);
        if (foodsError) throw foodsError;
        (foods || []).forEach((f: any) => {
          storeMap[String(f.id)] = String(f.store_name || "不明な店舗");
        });
      }

      const grouped: Record<string, CartItem[]> = {};
      items.forEach((item) => {
        const storeName = storeMap[item.food_id] || "不明な店舗";
        if (!grouped[storeName]) grouped[storeName] = [];
        grouped[storeName].push(item);
      });
      setGroupedByStore(grouped);
    } catch (err) {
      console.error("再グループ化エラー:", err);
      setGroupedByStore({ 不明な店舗: items });
    }
  };

  const refreshCartItems = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;

      let cartData = data || [];

      const changed = await dedupeCartIfNeeded(cartData, session.user.id);
      if (changed) {
        const { data: data2, error: err2 } = await supabase
          .from("cart")
          .select("*")
          .eq("user_id", session.user.id);
        if (err2) throw err2;
        cartData = data2 || [];
      }
      setCartItems(cartData);
      const qtyCount = (cartData || []).reduce(
        (sum, it) => sum + (it.quantity || 0),
        0
      );
      setCartCount(qtyCount);
      await regroupFromItems(cartData);

      let total = 0;
      let discount = 0;

      (cartData || []).forEach((item) => {
        total += item.total_price;
        if (item.is_takeout) {
          discount += 10 * item.quantity;
        }
      });

      setTotalAmount(total);
      setDiscountAmount(discount);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      toast.error("カート情報の取得に失敗しました");
    }
  };

  useEffect(() => {
    refreshCartItems();
  }, [router]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshCartItems();
      }
    };

    const handleFocus = () => {
      refreshCartItems();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const isTakeoutAvailable = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours < 11 || (hours === 11 && minutes <= 30);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 3) return;

    try {
      const itemToUpdate = cartItems.find((item) => item.id === itemId);
      if (!itemToUpdate) return;

      let unitPrice = itemToUpdate.price;
      if (itemToUpdate.size === "large") {
        unitPrice += 50;
      }

      const newTotalPrice = unitPrice * newQuantity;

      const { error } = await supabase
        .from("cart")
        .update({
          quantity: newQuantity,
          total_price: newTotalPrice,
        })
        .eq("id", itemId);

      if (error) throw error;

      const updatedItems = cartItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            total_price: newTotalPrice,
          };
        }
        return item;
      });

      setCartItems(updatedItems);

      let total = 0;
      let discount = 0;

      updatedItems.forEach((item) => {
        total += item.total_price;
        if (item.is_takeout) {
          discount += 10 * item.quantity;
        }
      });

      setTotalAmount(total);
      setDiscountAmount(discount);
      await regroupFromItems(updatedItems);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("数量の更新に失敗しました");
    }
  };

  const changeToRegularSize = async (itemId: string) => {
    try {
      const itemToUpdate = cartItems.find((item) => item.id === itemId);
      if (!itemToUpdate || itemToUpdate.size === "regular") return;

      const basePrice = itemToUpdate.price;
      const newTotalPrice = basePrice * itemToUpdate.quantity;

      const { error } = await supabase
        .from("cart")
        .update({
          size: "regular",
          total_price: newTotalPrice,
        })
        .eq("id", itemId);

      if (error) {
        console.error("普通サイズ更新エラー:", error);
        throw error;
      }

      const updatedItems = cartItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            size: "regular" as const,
            total_price: newTotalPrice,
          };
        }
        return item;
      });
      setCartItems(updatedItems);
      recalculateTotals(updatedItems);
      await regroupFromItems(updatedItems);

      toast.success("サイズを普通に変更しました");
    } catch (error) {
      console.error("サイズ変更エラー:", error);
      toast.error("サイズの変更に失敗しました");
    }
  };

  const resetToRegularSize = async (itemId: string) => {
    try {
      const item = cartItems.find((i) => i.id === itemId);
      if (!item) {
        console.error("アイテムが見つかりません");
        return;
      }

      const basePrice = item.price;
      const newTotal = basePrice * item.quantity;

      const { data, error } = await supabase
        .from("cart")
        .update({
          size: "regular",
          total_price: newTotal,
        })
        .eq("id", itemId)
        .select();

      if (error) {
        console.error("DB更新エラー:", error);
        throw error;
      }

      console.log("更新結果:", data);

      const newItems = cartItems.map((currentItem) => {
        if (currentItem.id === itemId) {
          return {
            ...currentItem,
            size: "regular" as const,
            total_price: newTotal,
          };
        }
        return currentItem;
      });
      setCartItems(newItems);
      recalculateTotals(newItems);
      await regroupFromItems(newItems);
      toast.success("サイズを普通に変更しました");
    } catch (error) {
      console.error("サイズ変更エラー:", error);
      toast.error("サイズの変更に失敗しました");
    }
  };

  const upgradeToLargeSize = async (itemId: string) => {
    try {
      // 対象アイテムを見つける
      const item = cartItems.find((i) => i.id === itemId);
      if (!item) {
        console.error("アイテムが見つかりません");
        return;
      }
      const basePrice = item.price;
      const newTotal = (basePrice + 50) * item.quantity;
      const { data, error } = await supabase
        .from("cart")
        .update({
          size: "large",
          total_price: newTotal,
        })
        .eq("id", itemId)
        .select();

      if (error) {
        console.error("DB更新エラー:", error);
        throw error;
      }

      console.log("更新結果:", data);

      const newItems = cartItems.map((currentItem) => {
        if (currentItem.id === itemId) {
          return {
            ...currentItem,
            size: "large" as const,
            total_price: newTotal,
          };
        }
        return currentItem;
      });
      setCartItems(newItems);
      recalculateTotals(newItems);
      await regroupFromItems(newItems);
      toast.success("サイズを大盛りに変更しました");
    } catch (error) {
      console.error("サイズ変更エラー:", error);
      toast.error("サイズの変更に失敗しました");
    }
  };

  const recalculateTotals = (items: CartItem[]) => {
    let total = 0;
    let discount = 0;
    items.forEach((item) => {
      total += item.total_price;
      if (item.is_takeout) {
        discount += 10 * item.quantity;
      }
    });
    setTotalAmount(total);
    setDiscountAmount(discount);
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("cart").delete().eq("id", itemId);

      if (error) throw error;

      const remainingItems = cartItems.filter((item) => item.id !== itemId);
      setCartItems(remainingItems);
      const qtyCount = remainingItems.reduce(
        (sum, it) => sum + (it.quantity || 0),
        0
      );
      setCartCount(qtyCount);

      let total = 0;
      let discount = 0;

      remainingItems.forEach((item) => {
        total += item.total_price;
        if (item.is_takeout) {
          discount += 10 * item.quantity;
        }
      });

      setTotalAmount(total);
      setDiscountAmount(discount);
      await regroupFromItems(remainingItems);
      toast.success("商品をカートから削除しました");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("商品の削除に失敗しました");
    }
  };

  const proceedToCheckout = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      try {
        localStorage.removeItem("checkout_item_ids");
        localStorage.removeItem("checkout_items_snapshot");
      } catch {}

      const paymentId = `payment_${Date.now()}_${session.user.id.substring(0, 8)}`;
      router.push(`/orders/cart/payment/${paymentId}`);
    } catch (error) {
      console.error("Error proceeding to checkout:", error);
      toast.error("決済画面への移動に失敗しました");
    }
  };

  const proceedToCheckoutForStore = async (storeName: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const items = groupedByStore[storeName] || [];
      if (items.length === 0) {
        toast.error("この店舗のカートに商品がありません");
        return;
      }

      const ids = items.map((i) => i.id);
      try {
        localStorage.setItem("checkout_item_ids", JSON.stringify(ids));
        localStorage.setItem(
          "checkout_items_snapshot",
          JSON.stringify(
            items.map((i) => ({
              id: i.id,
              food_id: i.food_id,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              image_url: i.image_url,
              size: i.size,
              is_takeout: i.is_takeout,
              total_price: i.total_price,
            }))
          )
        );
      } catch (e) {
        console.warn("localStorage書き込みに失敗:", e);
      }

      const paymentId = `payment_${Date.now()}_${session.user.id.substring(0, 8)}`;
      router.push(`/orders/cart/payment/${paymentId}`);
    } catch (error) {
      console.error("店舗別決済への移動失敗:", error);
      toast.error("決済画面への移動に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header cartCount={cartCount} />
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">カート</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">カートに商品がありません</p>
            <button
              onClick={() => router.push("/orders")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              商品一覧に戻る
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {Object.entries(groupedByStore).map(([storeName, items]) => {
                const storeTotals = items.reduce(
                  (acc, it) => {
                    acc.total += it.total_price;
                    if (it.is_takeout) acc.discount += 10 * it.quantity;
                    return acc;
                  },
                  { total: 0, discount: 0 }
                );
                const storeFinal = storeTotals.total - storeTotals.discount;

                return (
                  <div key={storeName} className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{storeName}</h2>
                      <div className="text-sm text-gray-600">
                        小計: ¥{storeTotals.total.toLocaleString()}{" "}
                        {storeTotals.discount > 0 && (
                          <span className="ml-2 text-green-600">
                            割引: -¥{storeTotals.discount.toLocaleString()}
                          </span>
                        )}
                        <span className="ml-2 font-semibold">
                          合計: ¥{storeFinal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border-b last:border-b-0"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="sm:w-24 sm:h-24 flex-shrink-0">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-24 h-24 object-cover rounded-md"
                            />
                          </div>
                          <div className="flex-grow">
                            <h3 className="font-semibold text-lg">
                              {item.name}
                            </h3>
                            <div className="flex flex-wrap gap-y-2 gap-x-4 mt-2">
                              <div className="flex items-center">
                                <span className="text-gray-600 text-sm mr-2">
                                  数量:
                                </span>
                                <div className="flex items-center">
                                  <button
                                    onClick={() =>
                                      updateQuantity(item.id, item.quantity - 1)
                                    }
                                    className="p-1 bg-gray-200 rounded-full disabled:opacity-50"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="mx-2">{item.quantity}</span>
                                  <button
                                    onClick={() =>
                                      updateQuantity(item.id, item.quantity + 1)
                                    }
                                    className="p-1 bg-gray-200 rounded-full disabled:opacity-50"
                                    disabled={item.quantity >= 3}
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mt-4">
                              <div>
                                <span className="font-bold">
                                  ¥{item.price}
                                  {item.size === "large" ? " + ¥50" : ""}
                                </span>
                                <span className="text-gray-600 text-sm ml-2">
                                  × {item.quantity}
                                </span>
                                {item.is_takeout && (
                                  <span className="text-green-600 text-sm ml-2">
                                    (-¥{10 * item.quantity})
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="p-4 flex justify-end">
                      <button
                        onClick={() => proceedToCheckoutForStore(storeName)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
                      >
                        この店舗の注文を確定
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-lg shadow mb-6 p-4">
              <h2 className="text-lg font-semibold mb-3">注文内容の確認</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>小計</span>
                  <span>¥{totalAmount.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>お持ち帰り割引</span>
                    <span>-¥{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>合計</span>
                  <span>
                    ¥{(totalAmount - discountAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            {Object.keys(groupedByStore).length > 1 ? (
              <div className="mt-4 text-sm text-gray-600">
                複数店舗の商品が含まれています。各店舗カード内のボタンからご注文ください。
              </div>
            ) : (
              <div className="flex justify-end"></div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
