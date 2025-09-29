"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "UNKNOWN";

interface PaymentData {
  merchantPaymentId: string;
  amount: number;
  orderDescription: string;
  acceptedAt?: string;
  status: PaymentStatus;
}

interface OrderData {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
}

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

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const maxRetries = 10;

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const merchantPaymentId = searchParams.get("merchantPaymentId");
        let savedPaymentData = null;
        try {
          savedPaymentData = localStorage.getItem("paypay_payment_data");
        } catch (e) {
          console.log("localStorage is not available on server side");
        }

        let paymentInfo = null;
        if (savedPaymentData) {
          paymentInfo = JSON.parse(savedPaymentData);
        }

        if (!merchantPaymentId && !paymentInfo?.merchantPaymentId) {
          router.push("/orders/cart");
          return;
        }

        const targetPaymentId =
          merchantPaymentId || paymentInfo.merchantPaymentId;
        console.log("決済ステータス確認中:", targetPaymentId);

        const response = await axios.post(
          "/api/checkPaymentStatus",
          {
            id: targetPaymentId,
          },
          {
            timeout: 10000,
          }
        );

        console.log("決済ステータスレスポンス:", response.data);

        if (response.data?.success) {
          const status = response.data.status;
          setPaymentStatus(status);

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
            if (!orderData && !isCreatingOrder) {
              const createdOrder = await createOrder(paymentInfo);
              if (createdOrder) {
                router.push(`/orders/complete?orderId=${createdOrder.id}`);
                return;
              }
            } else if (orderData) {
              router.push(`/orders/complete?orderId=${orderData.id}`);
              return;
            }
          } else if (status === "FAILED" || status === "CANCELED") {
            toast.error("決済が失敗しました");
            setLoading(false);
          } else if (status === "PENDING" && retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
            }, 3000);
          } else {
            setLoading(false);
          }
        } else {
          console.error("決済ステータス確認エラー:", response.data);

          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
            }, 3000);
          } else {
            setPaymentStatus("FAILED");
            setLoading(false);
            toast.error("決済ステータスの確認に失敗しました");
          }
        }
      } catch (error) {
        console.error("決済ステータス確認エラー:", error);

        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 3000);
        } else {
          setPaymentStatus("FAILED");
          setLoading(false);
          toast.error("決済ステータスの確認中にエラーが発生しました");
        }
      }
    };

    checkPaymentStatus();
  }, [searchParams, router, retryCount, orderData, isCreatingOrder]);

  const createOrder = async (paymentInfo: any): Promise<OrderData | null> => {
    if (isCreatingOrder) return null;

    setIsCreatingOrder(true);

    try {
      if (!paymentInfo) return null;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("セッションが見つかりません");
        return null;
      }

      const response = await axios.post(
        "/api/orders/create-from-paypay",
        {
          userId: session.user.id,
          cartItems: paymentInfo.cartItems,
          merchantPaymentId: paymentInfo.merchantPaymentId,
        },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.data?.success || !response.data?.orderId) {
        throw new Error(
          response.data?.details || "サーバーでの注文作成に失敗しました"
        );
      }

      const orderId: string = response.data.orderId;
      const orderNumber: string = response.data.orderNumber;

      try {
        localStorage.removeItem("paypay_payment_data");
      } catch {}

      const orderDataResult: OrderData = {
        id: orderId,
        orderNumber: orderNumber,
        totalAmount: paymentInfo.amount,
        paymentMethod: "paypay",
        createdAt: new Date().toISOString(),
      };
      setOrderData(orderDataResult);
      toast.success(`注文が完了しました（注文番号: ${orderNumber}）`);
      return orderDataResult;
    } catch (error: any) {
      console.error("注文作成処理エラー:", error);
      toast.error("注文データの作成に失敗しました。");
      return null;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleRetryCheck = () => {
    setLoading(true);
    setRetryCount(0);
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
        return orderData ? "注文が完了しました" : "注文を作成中です...";
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

          {loading && paymentStatus === "PENDING" && (
            <div className="mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                確認中... ({retryCount + 1}/{maxRetries})
              </p>
            </div>
          )}

          {/* 注文作成中の表示 */}
          {paymentStatus === "COMPLETED" && isCreatingOrder && (
            <div className="mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className="text-sm text-green-600">注文を作成中...</p>
            </div>
          )}

          <div className="space-y-4">
            {paymentStatus === "COMPLETED" && orderData && (
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

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <PaymentStatusContent />
    </Suspense>
  );
}
