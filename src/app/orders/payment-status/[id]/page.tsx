"use client";

import axios from "axios";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import Header from "@/app/_components/Header";

interface PaymentStatusPageProps {
  params: { id: string };
}

const PaymentStatusPage = ({ params }: PaymentStatusPageProps) => {
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      try {
        const response = await axios.post("/api/checkPaymentStatus", {
          id: params.id,
        });

        const { status } = response.data;
        setPaymentStatus(status);
        setLoading(false);

        console.log("Payment Status:", status);

        // 決済完了または失敗時はポーリングを停止（自動リダイレクトは削除）
        if (
          status === "COMPLETED" ||
          status === "FAILED" ||
          status === "CANCELED"
        ) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Failed to check payment status:", error);
        setError("決済ステータスの確認に失敗しました");
        setLoading(false);
        clearInterval(interval);
      }
    };

    // 初回実行
    checkPaymentStatus();

    // 4.5秒ごとにステータスをチェック
    interval = setInterval(checkPaymentStatus, 4500);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [params.id, router]);

  const getStatusDisplay = () => {
    switch (paymentStatus) {
      case "COMPLETED":
        return {
          icon: <CheckCircle size={48} className="text-green-500" />,
          title: "決済完了",
          message: "PayPay決済が正常に完了しました。",
          bgColor: "bg-green-50",
          textColor: "text-green-800",
        };
      case "FAILED":
        return {
          icon: <XCircle size={48} className="text-red-500" />,
          title: "決済失敗",
          message: "決済に失敗しました。もう一度お試しください。",
          bgColor: "bg-red-50",
          textColor: "text-red-800",
        };
      case "CANCELED":
        return {
          icon: <XCircle size={48} className="text-gray-500" />,
          title: "決済キャンセル",
          message: "決済がキャンセルされました。",
          bgColor: "bg-gray-50",
          textColor: "text-gray-800",
        };
      default:
        return {
          icon: <Clock size={48} className="text-blue-500" />,
          title: "決済処理中",
          message: "PayPay決済を処理しています。しばらくお待ちください。",
          bgColor: "bg-blue-50",
          textColor: "text-blue-800",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen bg-gray-100">
      <Header cartCount={0} />

      <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <button
            onClick={() => router.push("/orders")}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} className="mr-1" />
            注文履歴に戻る
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">{statusDisplay.icon}</div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {statusDisplay.title}
            </h1>

            <div
              className={`${statusDisplay.bgColor} ${statusDisplay.textColor} rounded-lg p-4 mb-6`}
            >
              <p className="font-medium">{statusDisplay.message}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">決済ID</h2>
              <p className="text-sm text-gray-600 font-mono break-all">
                {params.id}
              </p>
            </div>

            {paymentStatus === "PENDING" && (
              <div className="flex items-center justify-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ステータスを確認中...
              </div>
            )}

            {(paymentStatus === "FAILED" || paymentStatus === "CANCELED") && (
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/orders/cart")}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  カートに戻る
                </button>
                <button
                  onClick={() => router.push("/orders")}
                  className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  注文履歴を見る
                </button>
              </div>
            )}

            {paymentStatus === "COMPLETED" && (
              <div className="text-sm text-gray-500">
                2秒後に注文完了ページに移動します...
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentStatusPage;
