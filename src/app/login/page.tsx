"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Info, CheckCircle, XCircle } from "lucide-react";
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* お知らせとステータス セクション */}
      <div className="w-full md:w-1/2 bg-blue-50 p-6 md:p-12 flex flex-col justify-center">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Info className="mr-2 text-blue-500" />
              最近のお知らせ
            </h3>
            <div className="space-y-2">
              <p className="text-gray-600">現在、お知らせはありません。</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Clock className="mr-2 text-green-500" />
              営業状況
            </h3>
            <div className="flex items-center">
              {isOperating ? (
                <>
                  <CheckCircle className="mr-2 text-green-500" />
                  <span className="text-green-600">現在営業中です</span>
                </>
              ) : (
                <>
                  <XCircle className="mr-2 text-red-500" />
                  <span className="text-red-600">現在は休業中です</span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              現在の時刻: {format(currentTime, "HH:mm")}
            </p>
            <p className="text-sm text-gray-500">
              営業時間: 月〜金 9:00 - 14:00
            </p>
          </div>
        </div>
      </div>

      {/* ログインフォーム セクション */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <form
          onSubmit={handleLogin}
          className="bg-white p-6 sm:p-8 rounded shadow-md w-full max-w-md"
        >
          <h2 className="text-2xl mb-4 text-center">ログイン</h2>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
            required
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            ログイン
          </button>

          <div className="my-4 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500">または</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center bg-white border border-gray-300 p-2 rounded hover:bg-gray-50 mb-2"
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-5 h-5 mr-2"
            />
            Googleでログイン
          </button>

          <button
            type="button"
            onClick={handleXLogin}
            className="w-full flex items-center justify-center bg-white border border-gray-300 p-2 rounded hover:bg-gray-50"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 mr-2"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Xでログイン
          </button>

          <div className="mt-4 text-center space-y-2">
            <Link
              href="/login/new"
              className="block text-blue-500 hover:underline"
            >
              アカウントをお持ちでない方はこちら
            </Link>
            <Link
              href="/login/reissue"
              className="block text-blue-500 hover:underline"
            >
              パスワードを忘れた方はこちら
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
