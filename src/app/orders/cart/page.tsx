"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { Plus, Minus, Trash2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";

interface CartItem {
  id: string; // UUIDなのでstring型
  food_id: string; // UUIDなのでstring型に変更
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

  // カートアイテムを再取得する関数
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

      console.log("カートアイテム取得結果:", data);

      setCartItems(data || []);
      setCartCount(data?.length || 0);

      // 合計金額と割引額の計算
      let total = 0;
      let discount = 0;

      (data || []).forEach((item) => {
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

  // ページがフォーカスされた時にカートを再読み込み
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
    // 11:30までの場合のみtrue
    return hours < 11 || (hours === 11 && minutes <= 30);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 3) return;

    try {
      const itemToUpdate = cartItems.find((item) => item.id === itemId);
      if (!itemToUpdate) return;

      // 現在のサイズに基づいた単価を計算
      let unitPrice = itemToUpdate.price;
      if (itemToUpdate.size === "large") {
        unitPrice += 50; // 大盛りは+50円
      }

      // 新しい合計金額を計算
      const newTotalPrice = unitPrice * newQuantity;

      // データベース更新
      const { error } = await supabase
        .from("cart")
        .update({
          quantity: newQuantity,
          total_price: newTotalPrice,
        })
        .eq("id", itemId);

      if (error) throw error;

      // 状態を更新
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

      // 合計金額と割引額の再計算
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
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("数量の更新に失敗しました");
    }
  };

  // 普通サイズに変更する関数
  const changeToRegularSize = async (itemId: string) => {
    try {
      const itemToUpdate = cartItems.find((item) => item.id === itemId);
      if (!itemToUpdate || itemToUpdate.size === "regular") return;

      // 基本価格
      const basePrice = itemToUpdate.price;

      // 普通サイズの合計金額の計算（大盛り料金を含まない）
      const newTotalPrice = basePrice * itemToUpdate.quantity;

      console.log("普通サイズに変更:", {
        id: itemId,
        oldSize: itemToUpdate.size,
        newSize: "regular",
        price: basePrice,
        quantity: itemToUpdate.quantity,
        newTotal: newTotalPrice,
      });

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

      // UI更新
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

      // 合計を再計算
      recalculateTotals(updatedItems);

      toast.success("サイズを普通に変更しました");
    } catch (error) {
      console.error("サイズ変更エラー:", error);
      toast.error("サイズの変更に失敗しました");
    }
  };

  const resetToRegularSize = async (itemId: string) => {
    try {
      // 対象アイテムを見つける
      const item = cartItems.find((i) => i.id === itemId);
      if (!item) {
        console.error("アイテムが見つかりません");
        return;
      }

      console.log("変更前のアイテム:", item);

      // 基本価格
      const basePrice = item.price;
      // 普通サイズの合計金額（数量 × 基本価格）
      const newTotal = basePrice * item.quantity;

      console.log("計算:", {
        basePrice,
        quantity: item.quantity,
        newTotal,
      });

      // データベース更新 - 直接SQLと同等の操作
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

      // ローカル状態も更新
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

      // 状態を更新
      setCartItems(newItems);

      // 合計を再計算
      recalculateTotals(newItems);

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

      console.log("変更前のアイテム:", item);

      // 基本価格
      const basePrice = item.price;
      // 大盛りサイズの合計金額（数量 × (基本価格+50)）
      const newTotal = (basePrice + 50) * item.quantity;

      console.log("計算:", {
        basePrice,
        largeSizePrice: basePrice + 50,
        quantity: item.quantity,
        newTotal,
      });

      // データベース更新
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

      // ローカル状態も更新
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

      // 状態を更新
      setCartItems(newItems);

      // 合計を再計算
      recalculateTotals(newItems);

      toast.success("サイズを大盛りに変更しました");
    } catch (error) {
      console.error("サイズ変更エラー:", error);
      toast.error("サイズの変更に失敗しました");
    }
  };

  // 合計金額を再計算する関数
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

  const toggleTakeout = async (itemId: string) => {
    try {
      const itemToUpdate = cartItems.find((item) => item.id === itemId);
      if (!itemToUpdate) return;

      // テイクアウトに変更する場合は時間チェック
      const newIsTakeout = !itemToUpdate.is_takeout;
      if (newIsTakeout && !isTakeoutAvailable()) {
        toast.error("テイクアウトは11:30までの注文のみ受け付けています");
        return;
      }

      const { error } = await supabase
        .from("cart")
        .update({ is_takeout: newIsTakeout })
        .eq("id", itemId);

      if (error) throw error;

      // 状態を更新
      const updatedItems = cartItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            is_takeout: newIsTakeout,
          };
        }
        return item;
      });

      setCartItems(updatedItems);

      // 割引額の再計算
      let discount = 0;
      let total = 0;
      updatedItems.forEach((item) => {
        total += item.total_price;
        if (item.is_takeout) {
          discount += 10 * item.quantity;
        }
      });

      setTotalAmount(total);
      setDiscountAmount(discount);

      toast.success(
        newIsTakeout ? "テイクアウトに変更しました" : "イートインに変更しました"
      );
    } catch (error) {
      console.error("オプション変更エラー:", error);
      toast.error("お持ち帰り設定の変更に失敗しました");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("cart").delete().eq("id", itemId);

      if (error) throw error;

      // 状態から削除したアイテムを除外
      const remainingItems = cartItems.filter((item) => item.id !== itemId);
      setCartItems(remainingItems);
      setCartCount(remainingItems.length);

      // 合計金額と割引額の再計算
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

      // ユーザーIDまたは一意の決済IDを生成
      const paymentId = `payment_${Date.now()}_${session.user.id.substring(0, 8)}`;
      router.push(`/orders/cart/payment/${paymentId}`);
    } catch (error) {
      console.error("Error proceeding to checkout:", error);
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
            <div className="bg-white rounded-lg shadow mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="p-4 border-b last:border-b-0">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="sm:w-24 sm:h-24 flex-shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <div className="flex flex-wrap gap-y-2 gap-x-4 mt-2">
                        {/* 数量 */}
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

            <div className="flex justify-end">
              <button
                onClick={proceedToCheckout}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
              >
                注文確定へ進む
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
