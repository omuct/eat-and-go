"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
import ProductCard from "@/app/_components/ProductCard";
import { Food } from "@/app/_types/food";
import { Announcement } from "@/app/_types/announcement";
import Link from "next/link";
import { ChevronRight, Bell, Calendar } from "lucide-react";
import axios from "axios";

export default function OrdersPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      try {
        // セッションチェック
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        // 商品データとお知らせの取得を並行して実行
        const [foodsResult, announcementsResult] = await Promise.all([
          supabase
            .from("foods")
            .select("*")
            .eq("is_published", true)
            .or(
              `publish_start_date.is.null,publish_start_date.lt.${new Date().toISOString()}`
            )
            .or(
              `publish_end_date.is.null,publish_end_date.gt.${new Date().toISOString()}`
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        if (foodsResult.error) throw foodsResult.error;
        if (announcementsResult.error) throw announcementsResult.error;

        setFoods(foodsResult.data || []);
        setAnnouncements(announcementsResult.data || []);
      } catch (error) {
        console.error("Error:", error);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchData();
  }, [router]);

  const addToCart = async (
    userId: string,
    itemId: number,
    quantity: number,
    selectedType: string
  ) => {
    try {
      const response = await axios.post("/api/orders", {
        userId,
        itemId,
        quantity,
        selectedType,
      });
      console.log(response.data.message);
    } catch (error) {
      console.error("カートに商品を追加できませんでした:", error);
    }
  };

  const handleAddToCart = async (itemId: number, selectedType: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    await addToCart(session.user.id, itemId, 1, selectedType);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "business-hours":
        return "営業時間";
      case "menu":
        return "メニュー";
      case "other":
        return "その他";
      default:
        return category;
    }
  };

  const displayedAnnouncements = showAllAnnouncements
    ? announcements
    : announcements.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="p-8">
        {/* お知らせセクション */}
        <section className="max-w-7xl mx-auto mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  お知らせ
                </h2>
              </div>
              <Link
                href="/announcement"
                className="inline-flex items-center px-4 py-2 bg-white rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 text-sm sm:text-base font-medium shadow-sm"
              >
                <span>もっと見る</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {announcements.slice(0, 3).map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Link
                      href={`/announcement/${announcement.id}`}
                      className="group flex-1 min-w-0"
                    >
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {announcement.title}
                      </h3>
                    </Link>
                    <div className="flex items-center text-sm text-gray-500 shrink-0">
                      <Calendar className="w-4 h-4 mr-2" />
                      <time className="whitespace-nowrap">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                      {getCategoryLabel(announcement.category)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {announcements.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                現在お知らせはありません
              </div>
            )}
          </div>
        </section>

        {/* お知らせ詳細モーダル */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">
                    {selectedAnnouncement.title}
                  </h2>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                    {getCategoryLabel(selectedAnnouncement.category)}
                  </span>
                  <time className="text-gray-500 text-sm">
                    {new Date(
                      selectedAnnouncement.created_at
                    ).toLocaleDateString()}
                  </time>
                </div>

                {selectedAnnouncement.image_url && (
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/announcements/${selectedAnnouncement.image_url}`}
                    alt={selectedAnnouncement.title}
                    className="w-full max-h-96 object-cover rounded-lg mb-4"
                  />
                )}

                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: selectedAnnouncement.content,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 商品一覧セクション */}
        <section>
          <h2 className="text-2xl font-bold mb-4">商品一覧</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : foods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              商品がありません
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {foods.map((food) => (
                <ProductCard
                  key={food.id}
                  food={food}
                  onAddToCart={(selectedType) =>
                    handleAddToCart(food.id, selectedType)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
