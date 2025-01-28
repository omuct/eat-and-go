"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    alert(
      "アカウント作成が完了しました。ご登録いただいたメールアドレス宛に、認証メールをお送りいたしましたのご確認後ログインをお願いします。ログインページに移動します"
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
        <h2 className="text-2xl mb-4 text-center">アカウント登録</h2>
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
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          アカウント作成
        </button>
      </form>
    </div>
  );
}
