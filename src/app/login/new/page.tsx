"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("サインアップに失敗しました: " + error.message);
      return;
    }

    // サインアップ後にセッションを明示的にクリア
    await supabase.auth.signOut();

    alert(
      "新規登録が完了しました。ご登録いただいたメールアドレス宛に、認証メールをお送りいたしましたのご確認後ログインをお願いします。ログインページに移動します"
    );
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSignup}
        className="bg-white p-6 sm:p-8 rounded shadow-md w-full max-w-md relative"
      >
        <Link
          href="/login"
          className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 flex items-center"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
        </Link>
        {/* アプリ概要（要約） */}
        <div className="mb-4 p-3 rounded border bg-gray-50 text-sm text-gray-700">
          <p className="font-medium mb-1">アプリの概要</p>
          <p>
            スマホだけで注文から決済まで完結できるモバイルオーダーに対応し、出来上がり通知で待ち時間を有効活用、行列を緩和します。さらに、QRスキャンでゴミ捨てをエコポイントとして付与し、貯まったポイントは景品と交換可能。加えて、マップでゴミ箱の場所と混雑状況をリアルタイムに確認でき、空いているゴミ箱へ誘導してあふれを防ぎます。
          </p>
        </div>
        <h2 className="text-2xl mb-4 text-center">新規登録</h2>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 pr-10 border rounded"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
            aria-pressed={showPassword}
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          新規登録
        </button>
      </form>
    </div>
  );
}
