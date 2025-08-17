"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { ChevronLeft, CreditCard, Banknote } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
  params: {
    id: string;
  };
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

        const { data, error } = await supabase
          .from("cart")
          .select("*")
          .eq("user_id", session.user.id);

        if (error) throw error;

        if (!data || data.length === 0) {
          router.push("/orders");
          return;
        }

        setCartItems(data);

        // 合計金額と割引額の計算
        let total = 0;
        let discount = 0;

        data.forEach((item) => {
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
      console.log("PayPay決済開始:", { finalAmount });

      // PayPay決済リクエストを作成
      const paymentPayload = {
        merchantPaymentId: `order_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        amount: {
          amount: finalAmount,
          currency: "JPY",
        },
        orderDescription: `学食アプリ注文 - 合計${cartItems.length}点`,
        expiryDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15分後
        isAuthorization: false,
        redirectUrl: `${window.location.origin}/orders/payment-status`,
        redirectType: "WEB_LINK",
        userAgent: navigator.userAgent,
      };

      console.log("PayPay決済リクエスト:", paymentPayload);

      const response = await axios.post("/api/paypay", paymentPayload, {
        timeout: 30000, // 30秒タイムアウト
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("PayPay APIレスポンス:", response.data);

      // 成功レスポンスの確認（新しいAPI構造に対応）
      if (response.data?.success && response.data?.data?.url) {
        console.log("PayPay決済URL:", response.data.data.url);

        // 決済情報をローカルストレージに保存（決済完了後の処理用）
        localStorage.setItem(
          "paypay_payment_data",
          JSON.stringify({
            merchantPaymentId: paymentPayload.merchantPaymentId,
            amount: paymentPayload.amount.amount,
            cartItems: cartItems,
            userId: session.user.id,
            timestamp: Date.now(),
          })
        );

        // PayPay決済画面へリダイレクト
        window.location.href = response.data.data.url;
      }
      // 従来のレスポンス構造も対応
      else if (
        response.data?.BODY?.resultInfo?.code === "SUCCESS" &&
        response.data?.BODY?.data?.url
      ) {
        console.log("PayPay決済URL（従来形式）:", response.data.BODY.data.url);
        window.location.href = response.data.BODY.data.url;
      } else {
        console.error("PayPay決済URL取得失敗:", response.data);

        // 詳細なエラー情報を表示
        const errorMessage =
          response.data?.error ||
          response.data?.details ||
          response.data?.BODY?.resultInfo?.message ||
          "PayPay決済URLの取得に失敗しました";
        toast.error(`PayPay決済エラー: ${errorMessage}`);

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("PayPay決済エラー:", error);

      let errorMessage = "PayPay決済に失敗しました";

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          errorMessage = `PayPay決済エラー: ${error.response.data.error}`;
        } else if (error.response?.data?.details) {
          errorMessage = `PayPay決済エラー: ${error.response.data.details}`;
        } else if (error.code === "ECONNABORTED") {
          errorMessage =
            "PayPay決済がタイムアウトしました。再度お試しください。";
        } else if (error.response?.status === 500) {
          errorMessage =
            "PayPay決済サーバーエラーが発生しました。しばらく待ってから再度お試しください。";
        }
      } else if (error instanceof Error) {
        errorMessage = `PayPay決済エラー: ${error.message}`;
      }

      toast.error(errorMessage);
      setProcessingPayment(false);
    }
  };

  // 従来の決済処理（現金・クレジット）
  const handleProcessPayment = async () => {
    if (paymentMethod === "paypay") {
      await handlePayPayPayment();
      return;
    }

    setProcessingPayment(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // 処理中の表示を少し見せるために遅延を入れる
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // ダミーの決済処理（コンソールログ出力のみ）
      console.log("決済処理成功:", {
        paymentMethod,
        total: totalAmount - discountAmount,
        items: cartItems,
      });

      // 注文データを作成
      const orderData = {
        user_id: session.user.id,
        total_amount: totalAmount - discountAmount,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      // 注文を保存
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // 注文詳細を保存
      const orderDetailsData = cartItems.map((item) => ({
        order_id: order.id,
        food_id: item.food_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        is_takeout: item.is_takeout,
        amount: item.total_price - (item.is_takeout ? 10 * item.quantity : 0),
      }));

      const { error: detailsError } = await supabase
        .from("order_details")
        .insert(orderDetailsData);

      if (detailsError) throw detailsError;

      // カートを空にする
      const { error: clearCartError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", session.user.id);

      if (clearCartError) throw clearCartError;

      // 決済完了画面へリダイレクト
      router.push(`/orders/complete?orderId=${order.id}`);
    } catch (error) {
      console.error("決済処理エラー:", error);
      toast.error("決済処理中にエラーが発生しました");
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
            onClick={() => router.back()}
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

                <label
                  className={`border rounded-lg p-4 flex items-center cursor-pointer ${
                    paymentMethod === "credit"
                      ? "border-blue-500 bg-blue-50"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit"
                    checked={paymentMethod === "credit"}
                    onChange={() => setPaymentMethod("credit")}
                    className="mr-3"
                  />
                  <CreditCard size={24} className="mr-3 text-gray-600" />
                  <div>
                    <p className="font-medium">クレジットカード</p>
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
                onClick={handleProcessPayment}
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
