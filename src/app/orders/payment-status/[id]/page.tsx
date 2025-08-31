"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // Supabaseクライアントのパスを適宜修正してください
import Header from "@/app/_components/Header";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

// 決済ステータスの型定義
type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "UNKNOWN";

// 決済データのインターフェース定義
interface PaymentData {
  merchantPaymentId: string;
  amount: number;
  orderDescription: string;
  acceptedAt?: string;
  status: PaymentStatus;
}

// ローディング中に表示するコンポーネント
function LoadingComponent() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header cartCount={0} />
      <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">決済ステータスを読み込み中...</p>
        </div>
      </main>
    </div>
  );
}

// メインのコンテンツコンポーネント
function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 10; // 最大10回まで確認

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // URLパラメータから決済IDを取得 (以前は params.id でしたが、より柔軟な searchParams に変更)
        const merchantPaymentId = searchParams.get("merchantPaymentId");

        // ローカルストレージから決済データを取得
        let savedPaymentData = null;
        try {
          savedPaymentData = localStorage.getItem("paypay_payment_data");
        } catch (e) {
          console.log("localStorage is not available.");
        }

        let paymentInfo = null;
        if (savedPaymentData) {
          paymentInfo = JSON.parse(savedPaymentData);
        }

        if (!merchantPaymentId && !paymentInfo?.merchantPaymentId) {
          toast.error("決済IDが見つかりません");
          router.push("/orders/cart");
          return;
        }

        const targetPaymentId =
          merchantPaymentId || paymentInfo.merchantPaymentId;

        const response = await axios.post("/api/checkPaymentStatus", {
          id: targetPaymentId,
        });

        if (response.data?.success) {
          const status: PaymentStatus = response.data.status;
          setPaymentStatus(status);

          // 支払いデータをステートに保存
          if (response.data.merchantPaymentId) {
            setPaymentData({
              merchantPaymentId: response.data.merchantPaymentId,
              amount: response.data.amount || paymentInfo?.amount || 0,
              orderDescription:
                response.data.orderDescription || "学食アプリ注文",
              acceptedAt: response.data.acceptedAt,
              status: status,
            });
          }

          if (status === "COMPLETED") {
            toast.success("決済が完了しました！");
            await createOrder(paymentInfo);
            setTimeout(() => {
              router.push("/orders/complete"); // 完了ページへ
            }, 3000);
          } else if (status === "FAILED" || status === "CANCELED") {
            toast.error("決済が失敗またはキャンセルされました");
            setLoading(false);
          } else if (status === "PENDING" && retryCount < maxRetries) {
            // 3秒後に再試行
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
            }, 3000);
          } else {
            // PENDINGのままタイムアウトした場合
            setLoading(false);
          }
        } else {
          // APIからの応答が 'success: false' の場合
          if (retryCount < maxRetries) {
            setTimeout(() => setRetryCount((prev) => prev + 1), 3000);
          } else {
            setPaymentStatus("FAILED");
            setLoading(false);
            toast.error("決済ステータスの確認に失敗しました");
          }
        }
      } catch (error) {
        console.error("決済ステータス確認エラー:", error);
        if (retryCount < maxRetries) {
          setTimeout(() => setRetryCount((prev) => prev + 1), 3000);
        } else {
          setPaymentStatus("FAILED");
          setLoading(false);
          toast.error("決済ステータスの確認中にエラーが発生しました");
        }
      }
    };

    checkPaymentStatus();
  }, [retryCount, router, searchParams]);

  // 注文データを作成する関数
  const createOrder = async (paymentInfo: any) => {
    if (!paymentInfo) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("セッションが見つかりません");
      }

      const orderData = {
        user_id: session.user.id,
        total_amount: paymentInfo.amount,
        discount_amount: 0,
        payment_method: "paypay",
        payment_status: "completed",
        created_at: new Date().toISOString(),
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = paymentInfo.cartItems.map((item: any) => ({
        order_id: order.id,
        food_id: item.food_id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        is_takeout: item.is_takeout,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsError) throw itemsError;

      const { error: cartError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", session.user.id);
      if (cartError) throw cartError;

      localStorage.removeItem("paypay_payment_data");
      console.log("注文作成完了:", order);
    } catch (error) {
      console.error("注文作成処理エラー:", error);
      toast.error("注文データの作成に失敗しました。");
    }
  };

  // 再確認ボタンのハンドラ
  const handleRetryCheck = () => {
    setLoading(true);
    setRetryCount(0); // リトライカウントをリセットして再開
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "COMPLETED":
        return <CheckCircle size={64} className="text-green-500" />;
      case "FAILED":
      case "CANCELED":
        return <XCircle size={64} className="text-red-500" />;
      case "PENDING":
        return <Clock size={64} className="text-yellow-500" />;
      default:
        return <RefreshCw size={64} className="text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case "COMPLETED":
        return "決済が完了しました";
      case "FAILED":
        return "決済に失敗しました";
      case "CANCELED":
        return "決済がキャンセルされました";
      case "PENDING":
        return "決済を確認中です...";
      default:
        return "決済ステータスを確認中です...";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header cartCount={0} />
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
          <div className="mb-6">{getStatusIcon()}</div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            決済ステータス
          </h1>
          <p className="text-lg mb-6 text-gray-700">{getStatusMessage()}</p>

          {paymentData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2">決済詳細</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">決済ID:</span>{" "}
                  {paymentData.merchantPaymentId}
                </div>
                <div>
                  <span className="font-medium">金額:</span> ¥
                  {paymentData.amount.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">内容:</span>{" "}
                  {paymentData.orderDescription}
                </div>
                {paymentData.acceptedAt && (
                  <div>
                    <span className="font-medium">決済日時:</span>{" "}
                    {new Date(paymentData.acceptedAt).toLocaleString("ja-JP")}
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && paymentStatus === "PENDING" && (
            <div className="mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                確認中... ({retryCount + 1}/{maxRetries})
              </p>
            </div>
          )}

          <div className="space-y-4">
            {paymentStatus === "COMPLETED" && (
              <div className="text-green-600 font-medium">
                3秒後に完了ページに移動します...
              </div>
            )}

            {(paymentStatus === "FAILED" || paymentStatus === "CANCELED") && (
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/orders/cart")}
                  className="w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  カートに戻る
                </button>
              </div>
            )}

            {!loading &&
              retryCount >= maxRetries &&
              paymentStatus === "PENDING" && (
                <div className="space-y-2">
                  <p className="text-orange-600 text-sm">
                    決済ステータスの確認がタイムアウトしました
                  </p>
                  <button
                    onClick={handleRetryCheck}
                    className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    再度確認する
                  </button>
                  <button
                    onClick={() => router.push("/orders/cart")}
                    className="w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    カートに戻る
                  </button>
                </div>
              )}
          </div>
        </div>
      </main>
    </div>
  );
}

// エクスポートするメインコンポーネント
export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <PaymentStatusContent />
    </Suspense>
  );
}
