"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Info, CheckCircle, XCircle, Utensils } from "lucide-react";
import { format, parse } from "date-fns";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOperating, setIsOperating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const checkOperatingStatus = async () => {
      try {
        const now = new Date();
        setCurrentTime(now);

        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const isWeekday = currentDay >= 1 && currentDay <= 5;

        // クエリ方法を変更
        const { data, error } = await supabase
          .from("business_closures")
          .select("*")
          .eq("date", format(now, "yyyy-MM-dd"))
          .maybeSingle(); // .single()の代わりに.maybeSingle()を使用

        let operatingStatus = false;

        if (!data) {
          // データがない場合のデフォルト処理
          const startTime = new Date();
          startTime.setHours(9, 0, 0, 0);

          const endTime = new Date();
          endTime.setHours(14, 0, 0, 0);

          const currentTimeObj = new Date();
          currentTimeObj.setHours(currentHour, currentMinute, 0, 0);

          operatingStatus =
            isWeekday &&
            currentTimeObj >= startTime &&
            currentTimeObj < endTime;
        } else {
          // データがある場合の処理
          if (data.is_open === false) {
            operatingStatus = false;
          } else if (data.open_time && data.close_time) {
            const [openHour, openMinute] = data.open_time
              .split(":")
              .map(Number);
            const [closeHour, closeMinute] = data.close_time
              .split(":")
              .map(Number);

            const startTime = new Date();
            startTime.setHours(openHour, openMinute, 0, 0);

            const endTime = new Date();
            endTime.setHours(closeHour, closeMinute, 0, 0);

            const currentTimeObj = new Date();
            currentTimeObj.setHours(currentHour, currentMinute, 0, 0);

            operatingStatus =
              currentTimeObj >= startTime && currentTimeObj < endTime;
          } else {
            // デフォルトの営業時間
            const startTime = new Date();
            startTime.setHours(9, 0, 0, 0);

            const endTime = new Date();
            endTime.setHours(14, 0, 0, 0);

            const currentTimeObj = new Date();
            currentTimeObj.setHours(currentHour, currentMinute, 0, 0);

            operatingStatus =
              isWeekday &&
              currentTimeObj >= startTime &&
              currentTimeObj < endTime;
          }
        }

        setIsOperating(operatingStatus);
      } catch (error) {
        console.error("営業状況の確認中にエラーが発生しました:", error);
      }
    };

    // 初回即時実行
    checkOperatingStatus();

    // 1分ごとに更新
    const intervalId = setInterval(checkOperatingStatus, 60000);

    // クリーンアップ
    return () => clearInterval(intervalId);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("ログインに失敗しました: " + error.message);
      return;
    }

    router.push("/orders");
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/orders` },
    });

    if (error) {
      alert("Googleログインに失敗しました: " + error.message);
      return;
    }
  };

  const handleXLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitter", // Supabaseでは依然として"twitter"を使用
      options: { redirectTo: `${window.location.origin}/orders` },
    });

    if (error) {
      alert("Xログインに失敗しました: " + error.message);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gray-900 p-8 text-white text-center">
          <Utensils className="w-16 h-16 mx-auto mb-4 text-white" />
          <h1 className="text-2xl font-bold mb-2">EAT & GO</h1>
          <p className="text-sm text-gray-400">簡単注文</p>
        </div>

        <div className="p-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-gray-600">営業状況</p>
            <p
              className={`text-lg font-bold ${isOperating ? "text-green-600" : "text-red-600"}`}
            >
              {isOperating ? "営業中" : "営業時間外"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              営業時間: 月〜金 9:00 - 14:00
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="email"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                required
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="password"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              ログイン
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/login/new" className="text-gray-600 hover:underline">
              アカウント作成
            </Link>
            <span className="mx-2 text-gray-400">•</span>
            <Link
              href="/login/reissue"
              className="text-gray-600 hover:underline"
            >
              パスワードを忘れた方
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
