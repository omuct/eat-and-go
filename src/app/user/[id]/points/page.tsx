"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";

export default function UserPointsPage() {
  const params = useParams();
  const userId = params?.id as string;
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!userId) return;
      // 保有ポイント取得（profiles.points）
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", userId)
        .single();
      if (profileError) {
        setTotalPoints(0);
      } else {
        setTotalPoints(profile?.points ?? 0);
      }
      setLoading(false);
    };
    fetchPoints();
  }, [userId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <Link
            href="/user"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">マイページに戻る</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-8">ポイント確認</h1>
        <div className="mb-6 bg-white rounded-lg shadow p-6 flex items-center justify-between">
          <span className="text-lg font-semibold">保有ポイント</span>
          <span className="text-3xl font-bold text-yellow-500">
            {totalPoints.toLocaleString()} pt
          </span>
        </div>
        {loading ? (
          <div className="text-center text-gray-500">読み込み中...</div>
        ) : null}
      </div>
    </div>
  );
}
