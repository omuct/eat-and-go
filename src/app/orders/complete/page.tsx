"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function OrderCompletePage() {
  const router = useRouter();
  const [counter, setCounter] = useState(10);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("orderId");
    setOrderId(id);

    if (!id) {
      console.error("注文IDが見つかりません。リダイレクトします。");
      router.push("/orders");
      return;
    }

    // 表示用の注文番号を生成（簡略化のため、ランダム値を使用）
    const displayNumber = Math.floor(1000 + Math.random() * 9000);
    setOrderNumber(displayNumber.toString());

    // 5秒カウントダウン後にリダイレクト
    const timer = setInterval(() => {
      setCounter((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/orders");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

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
              <p className="text-gray-600">内部注文ID: {orderId}</p>
            </>
          ) : (
            <p className="text-red-500">注文番号を取得できませんでした。</p>
          )}

          <div className="max-w-md mx-auto mt-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h2 className="font-bold text-lg mb-2">
              ご注文ありがとうございます
            </h2>
            <p className="text-gray-700 mb-4">
              商品が準備できましたら、モニターにお名前が表示されますので、
              カウンターにてお受け取りください。
            </p>
            <p className="text-sm text-gray-600">
              ※注文確認画面はスマートフォンで保存することをおすすめします
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={() => router.push("/orders")}
              className="flex items-center justify-center mx-auto px-6 py-2 bg-blue-600 text-white rounded-lg"
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
