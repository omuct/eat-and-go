"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Utensils, Eye, EyeOff, UserPlus } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

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

    // ログイン後にプロフィール登録状況を確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      console.log("ログインユーザー:", user.id);

      try {
        // プロフィール情報を取得 - student_numberカラムを削除
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("name, phone, role")
          .eq("id", user.id);

        console.log("プロフィールクエリレスポンス:", {
          profiles,
          profileError,
        });

        if (profileError) {
          console.error("プロフィール取得エラー:", profileError);
          console.log("プロフィールが見つからない、アカウント設定へ");
          router.push(`/user/${user.id}/account`);
          return;
        }

        const profile = profiles?.[0];

        if (!profile) {
          console.log("プロフィールデータが存在しない、アカウント設定へ");
          router.push(`/user/${user.id}/account`);
        } else if (!profile.name || profile.name.trim() === "") {
          console.log("名前が未入力、アカウント設定へ");
          router.push(`/user/${user.id}/account`);
        } else {
          console.log("プロフィール登録済み、注文画面へ");
          router.push("/orders");
        }
      } catch (error) {
        console.error("プロフィール確認中にエラー:", error);
        // エラーが発生した場合はアカウント設定へ誘導
        router.push(`/user/${user.id}/account`);
      }
    } else {
      console.log("ユーザー情報取得失敗");
      router.push("/login");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });

    if (error) {
      alert("Googleログインに失敗しました: " + error.message);
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
          {/* 営業状況と営業時間表示は非表示化しました */}

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
                autoComplete="email"
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pr-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "パスワードを非表示" : "パスワードを表示"
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 rounded"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              ログイン
            </button>

            {/* 新規登録 強調ボタン */}
            <Link
              href="/login/new"
              className="mt-2 inline-flex items-center justify-center w-full py-2 px-4 rounded-md border-2 border-gray-800 text-gray-800 bg-white hover:bg-gray-50 transition-colors font-semibold"
            >
              <UserPlus className="w-5 h-5 mr-2" /> 新規登録
            </Link>
          </form>

          <div className="mt-6 text-center text-sm">
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
