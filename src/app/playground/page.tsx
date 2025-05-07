"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
import ProductCard from "@/app/_components/ProductCard";
import { Food, FoodCategory } from "@/app/_types/food";
import { Announcement } from "@/app/_types/announcement";
import Link from "next/link";
import {
  ChevronRight,
  Bell,
  Calendar,
  ShoppingCart,
  Plus,
  Minus,
  X,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";

const CATEGORIES = ["丼", "麺", "サラダ", "デザート", "飲み物"]; // Define your categories here

export default function OrdersPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  // カート関連の状態
  const [cartCount, setCartCount] = useState(0);
  const [cartAnimating, setCartAnimating] = useState(false);

  // 注文モーダル関連の状態
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLargeSize, setIsLargeSize] = useState(false);
  const [isTakeout, setIsTakeout] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isTakeoutAvailable = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 11:30までの場合のみtrue
    return hours < 11 || (hours === 11 && minutes <= 30);
  };

  // 現在のカート内のアイテム数をチェックする関数
  const fetchCartItemCount = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;
      setCartCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching cart count:", error);
    }
  };

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

        // カート内のアイテム数を取得
        await fetchCartItemCount();
      } catch (error) {
        console.error("Error:", error);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchData();
  }, [router]);

  // 商品をカートに追加する関数
  const handleAddToCart = async () => {
    if (!selectedFood) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // カート内の商品数をチェック
      const { data: cartItems, error: cartError } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", session.user.id);

      if (cartError) throw cartError;

      // 最大5個までの制限をチェック
      if (cartItems && cartItems.length >= 5) {
        toast.error("カートには最大5個までしか商品を追加できません");
        setShowOrderModal(false);
        return;
      }

      // 同じ商品の数をチェック
      const sameItems =
        cartItems?.filter((item) => item.food_id === selectedFood.id) || [];
      const currentQuantity = sameItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      if (currentQuantity + quantity > 3) {
        toast.error("同じ商品は最大3個までしか注文できません");
        setShowOrderModal(false);
        return;
      }

      // 価格計算
      let totalPrice = selectedFood.price * quantity;
      if (
        isLargeSize &&
        (selectedFood.category === "丼" || selectedFood.category === "麺")
      ) {
        totalPrice += 50 * quantity; // 大盛りは+50円
      }

      // カートに商品を追加
      const { error } = await supabase.from("cart").insert({
        user_id: session.user.id,
        food_id: selectedFood.id, // すでにUUID形式の文字列
        name: selectedFood.name,
        price: selectedFood.price,
        quantity: quantity,
        image_url: selectedFood.image_url,
        size: isLargeSize ? "large" : "regular",
        is_takeout: isTakeout,
        total_price: totalPrice,
      });

      if (error) throw error;

      // カート内のアイテム数を更新して通知
      await fetchCartItemCount();
      setCartAnimating(true);
      setTimeout(() => setCartAnimating(false), 1000);

      toast.success("商品をカートに追加しました");
      setShowOrderModal(false);
      setQuantity(1);
      setIsLargeSize(false);
      setIsTakeout(false);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("カートへの追加に失敗しました");
    }
  };

  // 商品カードをクリックしたときの処理
  const handleProductClick = (food: Food) => {
    setSelectedFood(food);
    setShowOrderModal(true);
    setQuantity(1);
    setIsLargeSize(false);
    setIsTakeout(false);
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
      <Header cartCount={cartCount} cartAnimating={cartAnimating} />
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
      <main className="p-8">
        {/* お知らせセクション */}{" "}
        <section className="max-w-7xl mx-auto mb-12">
          {" "}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 sm:p-8">
            {" "}
            <div className="flex justify-between items-center mb-6">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600" />{" "}
                </div>{" "}
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  お知らせ{" "}
                </h2>{" "}
              </div>{" "}
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
        {/* カートセクション */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">カテゴリを選択</h3>
          <div className="flex gap-3">
            <button
              className={`px-4 py-2 rounded-md ${
                selectedCategory === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              すべて
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                className={`px-4 py-2 rounded-md ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
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
            CATEGORIES.map((category) => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold mb-4">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {foods
                    .filter(
                      (food) =>
                        !selectedCategory || food.category === selectedCategory
                    )
                    .map((food) => (
                      <div
                        key={food.id}
                        className="cursor-pointer"
                        onClick={() => handleProductClick(food)}
                      >
                        <ProductCard food={food} />
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* 注文モーダル */}
      {showOrderModal && selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
            <div className="relative">
              <img
                src={selectedFood.image_url}
                alt={selectedFood.name}
                className="w-full h-48 object-cover"
              />
              <button
                onClick={() => setShowOrderModal(false)}
                className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{selectedFood.name}</h2>
              <p className="text-gray-700 mb-4">{selectedFood.description}</p>

              <div className="mb-4">
                <p className="font-bold text-lg">¥{selectedFood.price}</p>
                {isLargeSize &&
                  (selectedFood.category === "丼" ||
                    selectedFood.category === "麺") && (
                    <p className="text-blue-600">+¥50 (大盛り)</p>
                  )}
              </div>

              {/* サイズオプション（丼と麺のみ） */}
              {(selectedFood.category === "丼" ||
                selectedFood.category === "麺") && (
                <div className="mb-4">
                  <p className="font-medium mb-2">
                    サイズ{" "}
                    <span className="text-red-500 text-xs">
                      ※カートに追加後は変更できません
                    </span>
                  </p>
                  <div className="flex gap-3">
                    <button
                      className={`px-4 py-2 rounded-md ${
                        !isLargeSize
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setIsLargeSize(false)}
                    >
                      普通
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        isLargeSize
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setIsLargeSize(true)}
                    >
                      大盛り (+¥50)
                    </button>
                  </div>
                </div>
              )}

              {/* 食事タイプ選択 */}
              <div className="mb-4">
                <p className="font-medium mb-2">お召し上がり方法</p>
                <div className="flex gap-3">
                  <button
                    className={`px-4 py-2 rounded-md ${
                      !isTakeout
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setIsTakeout(false)}
                  >
                    イートイン
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${
                      isTakeout
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setIsTakeout(true)}
                    disabled={!isTakeoutAvailable()}
                  >
                    お持ち帰り (-¥10)
                    {!isTakeoutAvailable() && (
                      <span className="block text-xs text-red-500 mt-1">
                        ※11:30までの注文のみ
                      </span>
                    )}
                  </button>
                </div>
                {!isTakeoutAvailable() && isTakeout && (
                  <p className="text-red-500 text-sm mt-1">
                    11:30を過ぎているため、テイクアウト注文を受け付けていません。
                  </p>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-3 bg-blue-600 text-white rounded-md font-semibold"
              >
                カートに追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
