// Supabaseからメールアドレスを取得する例:
// const { data, error } = await supabase.from("profiles").select("email");
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VerifiedEmailManagerPage() {
  const [emails, setEmails] = useState<string[]>([]); // 認証済み
  const [allEmails, setAllEmails] = useState<string[]>([]); // profiles全件
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 認証済みメール一覧と全ユーザーのメール一覧取得
  const fetchEmails = async () => {
    setLoading(true);
    // 認証済みメール
    const { data: verified, error: verifiedError } = await supabase
      .from("verified_emails")
      .select("email");
    if (!verifiedError && verified) {
      setEmails(verified.map((row: { email: string }) => row.email));
    }
    // profilesテーブル全メール
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email");
    if (!profilesError && profiles) {
      setAllEmails(
        profiles
          .map((row: { email: string }) => row.email)
          .filter((email) => !!email)
      );
    }
    setLoading(false);
  };

  // 初回マウント時に全メールアドレスを自動認証
  useEffect(() => {
    const autoSync = async () => {
      await syncAllUserEmails();
      await fetchEmails();
    };
    autoSync();
  }, []);

  // メール追加
  const addEmail = async () => {
    if (!newEmail) return;
    // upsertで重複メールも必ず認証済みに
    const { error } = await supabase
      .from("verified_emails")
      .upsert({ email: newEmail }, { onConflict: "email" });
    if (!error) {
      setNewEmail("");
      await fetchEmails();
    }
  };

  // メール削除
  const removeEmail = async (email: string) => {
    const { error } = await supabase
      .from("verified_emails")
      .delete()
      .eq("email", email);
    if (!error) {
      fetchEmails();
    }
  };

  // すべてのユーザーのメールアドレスを認証済みに同期
  const syncAllUserEmails = async () => {
    setSyncing(true);
    // profilesテーブルから全ユーザーのemail取得
    const { data: users, error: userError } = await supabase
      .from("profiles")
      .select("email");
    if (!userError && users) {
      // すべてupsertで認証済みに
      const upsertEmails = users
        .map((u: { email: string }) => u.email)
        .filter((email) => !!email)
        .map((email) => ({ email }));
      if (upsertEmails.length > 0) {
        await supabase
          .from("verified_emails")
          .upsert(upsertEmails, { onConflict: "email" });
      }
      // 追加後に必ず最新状態を取得
      await fetchEmails();
    }
    setSyncing(false);
  };

  return (
    <div className="bg-white p-6 rounded shadow max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">メールアドレス管理</h2>
      <div className="mb-4 text-gray-700">
        <span className="font-semibold">
          現在認証しているメールアドレス数: {emails.length}
        </span>
        {emails.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <span>認証済みメール一覧:</span>
            <ul className="list-disc ml-6 mt-1">
              {emails.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mb-4 text-gray-700">
        <span className="font-semibold">
          全ユーザーのメールアドレス数: {allEmails.length}
        </span>
        {allEmails.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <span>全メールアドレス一覧:</span>
            <ul className="list-disc ml-6 mt-1">
              {allEmails.map((email) => (
                <li key={email}>
                  {email}
                  {emails.includes(email) ? (
                    <span className="ml-2 text-green-600">（認証済み）</span>
                  ) : (
                    <span className="ml-2 text-red-600">（未認証）</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mb-4 flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="メールアドレスを追加"
          className="border px-2 py-1 rounded w-full"
        />
        <button
          onClick={addEmail}
          className="bg-blue-600 text-white px-4 py-1 rounded"
          disabled={!newEmail || loading}
        >
          追加
        </button>
      </div>
      <button
        onClick={syncAllUserEmails}
        className="bg-green-600 text-white px-4 py-1 rounded mb-4"
        disabled={syncing || loading}
      >
        すべてのユーザーのメールアドレスを認証済みに同期
      </button>
      <ul className="divide-y">
        {emails.map((email) => (
          <li key={email} className="flex justify-between items-center py-2">
            <span>{email}</span>
            <button
              onClick={() => removeEmail(email)}
              className="text-red-500 hover:underline text-sm"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      {(loading || syncing) && (
        <div className="text-gray-500 mt-2">読み込み中...</div>
      )}
    </div>
  );
}
