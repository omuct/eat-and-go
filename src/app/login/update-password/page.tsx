"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // セッション確認（メールリンク経由でのアクセスを想定）
  useEffect(() => {
    const ensureSession = async () => {
      try {
        // すでにセッションがあるか確認し、なければURLのcodeで交換（UIには出さない）
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const href =
            typeof window !== "undefined" ? window.location.href : "";
          // 1) トークンハッシュ形式: #access_token=...&refresh_token=...
          if (typeof window !== "undefined" && window.location.hash) {
            const hash = new URLSearchParams(window.location.hash.substring(1));
            const access_token = hash.get("access_token");
            const refresh_token = hash.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
              return;
            }
          }
          // 2) PKCE code 形式
          if (href && href.includes("code=")) {
            await supabase.auth.exchangeCodeForSession(href as any);
          }
        }
      } catch {
        // no-op: UIに何も出さない
      }
    };
    ensureSession();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      toast.error("新しいパスワードを入力してください");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("パスワードが一致しません");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast.success("パスワードを変更しました");
      // 任意: ログイン画面に戻す
      router.push("/login");
    } catch (err: any) {
      toast.error(err?.message || "パスワード更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
      <form
        onSubmit={handlePasswordUpdate}
        className="bg-white p-6 sm:p-8 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl mb-4 text-center">新しいパスワードの設定</h2>

        {/* セッション状態の案内表示はなし */}

        <input
          type="password"
          placeholder="新しいパスワード"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
          minLength={6}
        />
        <input
          type="password"
          placeholder="パスワード（確認）"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "更新中..." : "パスワードを更新"}
        </button>
      </form>
    </div>
  );
}
