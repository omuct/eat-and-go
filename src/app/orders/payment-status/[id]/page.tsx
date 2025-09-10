"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  // useRefを使って「処理開始フラグ」を管理
  const hasStartedProcessing = useRef(false);

  useEffect(() => {
    // このuseEffectは初回の一度しか実行されない
    if (hasStartedProcessing.current) {
      return; // 既に処理が開始されていたら何もしない
    }
    hasStartedProcessing.current = true; // 処理開始のフラグを立てる

    const processPayment = async () => {
      try {
        const savedPaymentData = localStorage.getItem("paypay_payment_data");
        if (!savedPaymentData) {
          toast.error("決済情報が見つかりません。");
          router.push("/orders/cart");
          return;
        }
        const paymentInfo = JSON.parse(savedPaymentData);

        // 最大10回、3秒ごとにステータスを確認するループ
        for (let i = 0; i < 10; i++) {
          const response = await axios.post("/api/checkPaymentStatus", {
            id: paymentInfo.merchantPaymentId,
          });

          const status: PaymentStatus = response.data?.status || "UNKNOWN";

          if (status === "COMPLETED") {
            setPaymentStatus("COMPLETED");
            setPaymentData(response.data?.data);
            toast.success("決済が完了しました！注文を作成します...");

            // 注文作成処理
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (!session) throw new Error("認証情報が見つかりません。");

            const createOrderResponse = await axios.post(
              "/api/orders/create-from-paypay",
              {
                userId: paymentInfo.userId,
                cartItems: paymentInfo.cartItems,
                merchantPaymentId: paymentInfo.merchantPaymentId,
              },
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            if (
              createOrderResponse.data?.success ||
              createOrderResponse.data?.message
            ) {
              localStorage.removeItem("paypay_payment_data");
              const orderId = createOrderResponse.data.orderId;
              router.push(`/orders/complete?orderId=${orderId}`);
              return; // 処理成功、ループを抜ける
            } else {
              throw new Error(
                createOrderResponse.data?.details || "注文作成に失敗しました"
              );
            }
          } else if (status === "FAILED" || status === "CANCELED") {
            setPaymentStatus(status);
            setLoading(false);
            return; // 処理失敗、ループを抜ける
          }

          // 3秒待機
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // ループがタイムアウトした場合
        setPaymentStatus("FAILED"); // タイムアウトを失敗として扱う
        setLoading(false);
        toast.error("決済の確認がタイムアウトしました。");
      } catch (error) {
        setPaymentStatus("FAILED");
        setLoading(false);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "決済処理中にエラーが発生しました";
        toast.error(errorMessage);
      }
    };

    processPayment();
  }, []); // 依存配列を空にすることで、初回の一度だけ実行される

  // 再確認ボタンのハンドラ
  const handleRetryCheck = () => {
    window.location.reload(); // ページをリロードして再試行
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
              <p className="text-sm text-gray-600">確認中...</p>
            </div>
          )}

          <div className="space-y-4">
            {paymentStatus === "COMPLETED" && (
              <div className="text-green-600 font-medium">
                完了ページに移動します...
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

            {!loading && paymentStatus === "PENDING" && (
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
