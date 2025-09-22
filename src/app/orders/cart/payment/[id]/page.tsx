"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { ChevronLeft, CreditCard, Banknote } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { generateOrderNumber } from "@/app/_utils/orderNumberGenerator";
import { sendOrderConfirmationEmail } from "@/app/_utils/sendOrderEmail";
import { createOrder } from "@/app/_utils/createOrder";
import axios from "axios";

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

interface PaymentPageProps {
  params: { id: string };
}

export default function PaymentPage({ params }: PaymentPageProps) {
  const router = useRouter();
  const paymentId = params.id;
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "credit" | "paypay"
  >("cash");
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [payPayUrl, setPayPayUrl] = useState("");

  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        // まずスナップショットがあればそれを使用
        let snapshotItems: CartItem[] | null = null;
        try {
          const rawSnap = localStorage.getItem("checkout_items_snapshot");
          if (rawSnap) snapshotItems = JSON.parse(rawSnap);
        } catch {}

        let fetched: any[] = [];
        if (!snapshotItems) {
          const { data, error } = await supabase
            .from("cart")
            .select("*")
            .eq("user_id", session.user.id);
          if (error) throw error;
          if (!data || data.length === 0) {
            router.push("/orders");
            return;
          }
          fetched = data;
        }

        // 店舗別遷移などで選択アイテムが指定されている場合に絞り込む
        let selectedIds: string[] | null = null;
        try {
          const raw = localStorage.getItem("checkout_item_ids");
          if (raw) {
            selectedIds = JSON.parse(raw);
          }
        } catch (e) {
          console.warn("checkout_item_idsの読み込みに失敗:", e);
        }

        const source = snapshotItems ?? fetched;
        let filtered =
          selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0
            ? (source || []).filter((i: any) => selectedIds!.includes(i.id))
            : source || [];

        // 選択IDがあるのに一致が0件なら全件にフォールバック
        if (selectedIds && selectedIds.length > 0 && filtered.length === 0) {
          filtered = source || [];
        }

        setCartItems(filtered);

        // 合計金額と割引額の計算
        let total = 0;
        let discount = 0;

        filtered.forEach((item) => {
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

    fetchCartItems();
  }, [router]);

  // PayPay決済処理
  const handlePayPayPayment = async () => {
    setProcessingPayment(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("ログインが必要です");
        router.push("/login");
        return;
      }

      const finalAmount = totalAmount - discountAmount;

      const paymentPayload = {
        amount: {
          amount: finalAmount,
          currency: "JPY",
        },
        orderDescription: `EAT & GO注文 - 合計${cartItems.length}点`,
        redirectUrl: `${window.location.origin}/orders/payment-status`, // リダイレクト先
      };

      const response = await axios.post("/api/paypay", paymentPayload);

      if (response.data?.success && response.data?.data?.url) {
        // 決済情報をローカルストレージに保存
        localStorage.setItem(
          "paypay_payment_data",
          JSON.stringify({
            merchantPaymentId: response.data.data.merchantPaymentId, // APIから返されたIDを使用
            amount: finalAmount,
            cartItems: cartItems,
            userId: session.user.id,
          })
        );

        try {
          localStorage.removeItem("checkout_item_ids");
          localStorage.removeItem("checkout_items_snapshot");
        } catch {}

        // PayPay決済画面へリダイレクト
        window.location.href = response.data.data.url;
      } else {
        throw new Error("PayPay決済URLの取得に失敗しました");
      }
    } catch (error) {
      console.error("PayPay決済エラー:", error);
      toast.error("PayPay決済の準備に失敗しました。");
      setProcessingPayment(false);
    }
  };

  // 従来の決済処理（現金・クレジット）
  const handleProcessPayment = async () => {
    setProcessingPayment(true);

    try {
      // セッション確認
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("認証エラー:", sessionError);
        router.push("/login");
        return;
      }

      console.log("認証済みユーザー:", session.user.id);

      // プロファイルの確認・作成
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // プロファイルが存在しない場合は作成
        const { error: createError } = await supabase.from("profiles").insert({
          id: session.user.id,
          role: "user",
          name: session.user.email?.split("@")[0] || "ゲスト",
        });

        if (createError) {
          console.error("プロファイル作成エラー:", createError);
          throw new Error("ユーザープロファイルの作成に失敗しました");
        }
      }

      const { orderId } = await createOrder({
        userId: session.user.id,
        cartItems: cartItems,
        paymentMethod: paymentMethod,
        supabaseClient: supabase,
      });

      // 注文作成成功後に選択情報をクリア
      try {
        localStorage.removeItem("checkout_item_ids");
        localStorage.removeItem("checkout_items_snapshot");
      } catch {}

      // 完了画面へ
      router.push(`/orders/complete?orderId=${orderId}`);
    } catch (error) {
      console.error("決済処理エラー:", error);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      toast.error(`決済処理中にエラーが発生しました: ${errorMessage}`);
      setProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header cartCount={cartItems.length} />
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <button
            onClick={() => {
              try {
                localStorage.removeItem("checkout_item_ids");
                localStorage.removeItem("checkout_items_snapshot");
              } catch {}
              router.back();
            }}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft size={20} className="mr-1" />
            カートに戻る
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-6">お支払い方法</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">支払い方法の選択</h2>
              <div className="space-y-4">
                <label
                  className={`border rounded-lg p-4 flex items-center cursor-pointer ${
                    paymentMethod === "cash" ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={() => setPaymentMethod("cash")}
                    className="mr-3"
                  />
                  <Banknote size={24} className="mr-3 text-gray-600" />
                  <div>
                    <p className="font-medium">現金払い</p>
                    <p className="text-sm text-gray-500">
                      商品受け取り時にお支払いください
                    </p>
                  </div>
                </label>

                {/* PayPay決済オプション */}
                <label
                  className={`border rounded-lg p-4 flex items-center cursor-pointer ${
                    paymentMethod === "paypay"
                      ? "border-blue-500 bg-blue-50"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypay"
                    checked={paymentMethod === "paypay"}
                    onChange={() => setPaymentMethod("paypay")}
                    className="mr-3"
                  />
                  <div className="mr-3 w-6 h-6 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">
                    P
                  </div>
                  <div>
                    <p className="font-medium">PayPay決済</p>
                    <p className="text-sm text-gray-500">QRコードで簡単決済</p>
                  </div>
                </label>
              </div>

              {/* PayPay決済リンク表示 */}
              {payPayUrl && paymentMethod === "paypay" && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    PayPay決済リンクが生成されました：
                  </p>
                  <a
                    href={payPayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-red-500 hover:bg-red-600 text-white text-center font-bold py-2 px-4 rounded transition-colors"
                  >
                    PayPayで支払う
                  </a>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">注文内容</h2>
              <div className="space-y-2 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} {item.size === "large" ? "(大盛り)" : ""} ×{" "}
                      {item.quantity}
                    </span>
                    <span>¥{item.total_price.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
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

              <button
                onClick={
                  paymentMethod === "paypay"
                    ? handlePayPayPayment
                    : handleProcessPayment
                }
                disabled={processingPayment}
                className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-blue-400 flex justify-center items-center"
              >
                {processingPayment ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>

                    {paymentMethod === "paypay"
                      ? "PayPay決済処理中..."
                      : "決済処理中..."}
                  </>
                ) : paymentMethod === "paypay" ? (
                  "PayPayで注文する"
                ) : (
                  "注文を確定する"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
