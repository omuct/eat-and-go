"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function PasswordReset() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        "https://react-gakusyoku-app.vercel.app/login/update-password",
    });

    if (error) {
      alert("パスワードリセットに失敗しました: " + error.message);
      return;
    }

    alert("パスワードリセット用のメールを送信しました");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handlePasswordResetRequest}
        className="bg-white p-6 sm:p-8 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl mb-4 text-center">パスワード再設定</h2>
        <p className="text-center mb-4">
          パスワード再設定用のメールを送信します。登録済みのメールアドレスを入力してください。
        </p>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          パスワードリセットメールを送信
        </button>
      </form>
    </div>
  );
}
