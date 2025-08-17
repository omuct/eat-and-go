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

export default function OrdersPage() {
  const [selectedStore, setSelectedStore] = useState<string>(""); // 選択された店舗
  const [availableStores, setAvailableStores] = useState<string[]>([]); // 利用可能な店舗一覧
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

        // 利用可能な店舗一覧を設定
        const stores = getAvailableStores(foodsResult.data || []);
        setAvailableStores(stores);

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

      toast.success(
        <div className="flex flex-col gap-2">
          <span>商品をカートに追加しました</span>
          <button
            onClick={() => {
              router.push("/orders/cart");
              toast.dismiss();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            カートに移動
          </button>
        </div>,
        {
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
        }
      );
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

  // 利用可能な店舗一覧を取得
  const getAvailableStores = (foodsData: Food[]) => {
    const stores = Array.from(
      new Set(
        foodsData.map((food) => String(food.store_name ?? "店舗情報なし"))
      )
    );
    return stores.sort();
  };

  // 店舗でフィルタリングされた商品を取得
  const getFilteredFoods = () => {
    if (!selectedStore) return foods;
    return foods.filter(
      (food) => (food.store_name || "店舗情報なし") === selectedStore
    );
  };

  // 店舗別にグループ化された商品を取得
  const getGroupedFoods = () => {
    const filteredFoods = getFilteredFoods();
    const grouped = filteredFoods.reduce(
      (groups, food) => {
        const storeName = food.store_name || "店舗情報なし";
        if (!groups[storeName]) {
          groups[storeName] = [];
        }
        groups[storeName].push(food);
        return groups;
      },
      {} as Record<string, typeof filteredFoods>
    );

    // 店舗名でソート
    const sortedStoreNames = Object.keys(grouped).sort();
    const result: Record<string, typeof filteredFoods> = {};
    sortedStoreNames.forEach((storeName) => {
      result[storeName] = grouped[storeName];
    });

    return result;
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
        {/* 商品一覧セクション */}
        <section>
          <h2 className="text-2xl font-bold mb-4">商品一覧</h2>

          {/* 店舗選択ドロップダウン */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  店舗を選択:
                </span>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">全ての店舗</option>
                  {availableStores.map((store) => (
                    <option key={store} value={store}>
                      {store}
                    </option>
                  ))}
                </select>
              </div>

              {/* 選択状態の表示 */}
              {selectedStore && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <span>選択中: {selectedStore}</span>
                  <button
                    onClick={() => setSelectedStore("")}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    クリア
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : getFilteredFoods().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedStore
                ? `「${selectedStore}」の商品がありません`
                : "商品がありません"}
            </div>
          ) : (
            // 店舗別グループ表示（常に店舗名でソート）
            (() => {
              const groupedFoods = getGroupedFoods();
              const storeNames = Object.keys(groupedFoods);

              return (
                <div className="space-y-12">
                  {storeNames.map((storeName) => (
                    <div
                      key={storeName}
                      className="bg-white rounded-lg shadow-sm overflow-hidden"
                    >
                      {/* 店舗名ヘッダー */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <span className="text-blue-600 font-bold text-sm">
                              店舗
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800">
                            {storeName}
                          </h3>
                          <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                            {groupedFoods[storeName].length}品
                          </span>
                          {selectedStore && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              選択中
                            </span>
                          )}
                        </div>
                      </div>

                      {/* その店舗の商品一覧 */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {groupedFoods[storeName].map((food) => (
                            <div
                              key={food.id}
                              className="cursor-pointer transform hover:scale-105 transition-transform"
                              onClick={() => handleProductClick(food)}
                            >
                              <ProductCard food={food} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
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
