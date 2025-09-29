"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
import { CheckCircle, ArrowRight } from "lucide-react";
import { getOrderNumberById } from "@/app/_utils/orderNumberGenerator";

export default function OrderCompletePage() {
  const router = useRouter();
  const [counter, setCounter] = useState(10);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const initializePage = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("orderId");

        if (!id) {
          console.error("注文IDが見つかりません。リダイレクトします。");
          setTimeout(() => {
            router.push("/orders");
          }, 100);
          return;
        }
        setOrderId(id);
        const fetchedOrderNumber = await getOrderNumberById(id);
        setOrderNumber(fetchedOrderNumber);
        setIsLoading(false);
        timer = setInterval(() => {
          setCounter((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setTimeout(() => {
                router.push("/orders");
              }, 0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (error) {
        console.error("ページ初期化エラー:", error);
        setTimeout(() => {
          router.push("/orders");
        }, 100);
      }
    };

    initializePage();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            注文が完了しました
          </h1>
          {orderNumber ? (
            <>
              <p className="text-gray-700 mb-2">
                ご注文番号: <span className="font-bold">{orderNumber}</span>
              </p>
              {orderId && (
                <p className="text-gray-500 text-sm mb-4">
                  注文ID: {orderId.substring(0, 8)}...
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-700 mb-4">ご注文ありがとうございます</p>
          )}
          <p className="text-gray-600 mb-6">
            注文内容を確認し、準備が整い次第お知らせいたします。
          </p>

          <div className="mt-8">
            <button
              onClick={() => router.push("/orders")}
              className="flex items-center justify-center mx-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              トップページへ
              <ArrowRight size={16} className="ml-2" />
            </button>
            <p className="text-gray-500 text-sm mt-4">
              {counter}秒後に自動的にトップページへ移動します
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
