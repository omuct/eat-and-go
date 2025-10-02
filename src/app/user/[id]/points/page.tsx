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
  const [isRedeeming, setIsRedeeming] = useState(false);
  type Reward = {
    id: string;
    name: string;
    cost: number;
    description?: string;
    emoji?: string;
  };
  const rewards: Reward[] = [
    {
      id: "eco-bag",
      name: "エコバッグ",
      cost: 10,
      description: "ロゴ入りのマイバッグ",
      emoji: "🛍️",
    },
    {
      id: "sticker",
      name: "ステッカー",
      cost: 5,
      description: "イベント限定デザイン",
      emoji: "🏷️",
    },
    {
      id: "bottle",
      name: "ボトル",
      cost: 20,
      description: "リユースできるボトル",
      emoji: "🧴",
    },
  ];
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!userId) return;
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

        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4">ポイント交換</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rewards.map((item) => {
              const insufficient = totalPoints < item.cost;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow p-5 flex flex-col"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl" aria-hidden>
                      {item.emoji ?? "🎁"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <span className="text-sm text-gray-600">
                          {item.cost.toLocaleString()} pt
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                        insufficient || isRedeeming
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      disabled={insufficient || isRedeeming}
                      onClick={() => setConfirmReward(item)}
                    >
                      交換する
                    </button>
                  </div>
                  {insufficient && (
                    <p className="text-xs text-red-500 mt-2">
                      ポイントが不足しています
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {confirmReward && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-3">本当に交換しますか？</h3>
              <p className="text-sm text-gray-700 mb-6">
                「{confirmReward.name}」と {confirmReward.cost.toLocaleString()}{" "}
                pt を交換します。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setConfirmReward(null)}
                >
                  いいえ
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    isRedeeming
                      ? "bg-gray-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={async () => {
                    if (!confirmReward) return;
                    try {
                      setIsRedeeming(true);
                      const { data: sessionData } =
                        await supabase.auth.getSession();
                      const session = sessionData?.session;
                      if (!session) {
                        alert("ログインが必要です");
                        setIsRedeeming(false);
                        return;
                      }
                      const { data: profile, error: profileError } =
                        await supabase
                          .from("profiles")
                          .select("points")
                          .eq("id", userId)
                          .single();
                      if (profileError) {
                        alert("ポイントの取得に失敗しました");
                        setIsRedeeming(false);
                        return;
                      }
                      const currentPoints = profile?.points ?? 0;
                      if (currentPoints < confirmReward.cost) {
                        alert("ポイントが不足しています");
                        setIsRedeeming(false);
                        setConfirmReward(null);
                        return;
                      }
                      const newPoints = currentPoints - confirmReward.cost;
                      const { error: updateError } = await supabase
                        .from("profiles")
                        .update({ points: newPoints })
                        .eq("id", userId);
                      if (updateError) {
                        alert("交換処理に失敗しました");
                        setIsRedeeming(false);
                        return;
                      }
                      setTotalPoints(newPoints);
                      alert(
                        "交換が完了しました。引換所で本画面を提示してください。"
                      );
                    } catch (e) {
                      console.error(e);
                      alert("予期せぬエラーが発生しました");
                    } finally {
                      setIsRedeeming(false);
                      setConfirmReward(null);
                    }
                  }}
                  disabled={isRedeeming}
                >
                  はい
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
