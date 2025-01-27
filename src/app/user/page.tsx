"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
import { History, UserCog } from "lucide-react"; // アイコンを追加

export default function UserPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUserId(session.user.id);
    };

    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">マイページ</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 注文履歴カード */}
          <div
            onClick={() => userId && router.push(`/user/${userId}/history`)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center space-x-4 mb-4">
              <History size={32} className="text-blue-600" />
              <h2 className="text-xl font-semibold">注文履歴</h2>
            </div>
            <p className="text-gray-600">過去の注文履歴を確認できます。</p>
          </div>

          {/* アカウント情報カード */}
          <div
            onClick={() => userId && router.push(`/user/${userId}/account`)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center space-x-4 mb-4">
              <UserCog size={32} className="text-blue-600" />
              <h2 className="text-xl font-semibold">アカウント設定</h2>
            </div>
            <p className="text-gray-600">
              アカウント情報の確認・変更ができます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
