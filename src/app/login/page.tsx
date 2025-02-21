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
      options: {
        redirectTo: `${window.location.origin}/orders`,
      },
    });

    if (error) {
      alert("Googleログインに失敗しました: " + error.message);
      return;
    }
  };

  const handleXLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitter", // Supabaseでは依然として"twitter"を使用
      options: {
        redirectTo: `${window.location.origin}/orders`,
      },
    });

    if (error) {
      alert("Xログインに失敗しました: " + error.message);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden flex flex-col md:flex-row">
        {/* イラストレーションセクション */}
        <div className="flex flex-col justify-center items-center bg-gradient-to-br from-blue-500 to-purple-600 p-8 md:p-12 text-white text-center">
          <div className="mb-8 md:mb-12">
            <Utensils className="w-16 h-16 md:w-24 md:h-24 text-white mb-4 md:mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              学食予約システム
            </h2>
          </div>

          <div className="bg-white/10 rounded-xl p-4 md:p-6 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock
                  className={`w-5 h-5 md:w-6 md:h-6 ${isOperating ? "text-green-400" : "text-red-400"}`}
                />
                <span className="text-sm md:text-base">営業状況</span>
              </div>
              <span
                className={`
            px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-semibold 
            ${isOperating ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
          `}
              >
                {isOperating ? "営業中" : "休業中"}
              </span>
            </div>
            <p className="text-xs md:text-sm text-white/70 mt-2">
              営業時間: 月〜金 9:00 - 14:00
            </p>
          </div>
        </div>

        {/* ログインセクション */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h1 className="text-2xl font-bold mb-6 text-center">ログイン</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ログイン
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">または</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="w-5 h-5 mr-2"
              />
              Googleログイン
            </button>

            <button
              onClick={handleXLogin}
              className="flex items-center justify-center py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 mr-2"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Xログイン
            </button>
          </div>

          <div className="text-center mt-6 space-y-2">
            <Link
              href="/login/new"
              className="block text-blue-600 hover:underline text-sm"
            >
              アカウント作成
            </Link>
            <Link
              href="/login/reissue"
              className="block text-blue-600 hover:underline text-sm"
            >
              パスワードを忘れた方
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
