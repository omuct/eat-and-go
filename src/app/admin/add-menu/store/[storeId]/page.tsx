"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Store,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Food {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  is_published: boolean;
  publish_start_date: string | null;
  publish_end_date: string | null;
  store_name: string;
  category: string;
}

interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
}

export default function StoreMenuManagementPage({
  params,
}: {
  params: { storeId: string };
}) {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStore = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", params.storeId)
        .single();

      if (error) throw error;

      const storeData: Store = {
        id: Number(data.id),
        name: String(data.store_name || data.name || ""),
        address: String(data.address || ""),
        phone: String(data.phone || ""),
        opening_hours: String(data.opening_hours || ""),
      };

      setStore(storeData);
    } catch (error) {
      console.error("Error fetching store:", error);
      toast.error("店舗情報の取得に失敗しました");
      router.push("/admin/add-menu");
    }
  };

  const fetchFoods = async () => {
    if (!store) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .eq("store_name", store.name)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFoods(data || []);
    } catch (error) {
      console.error("Error fetching foods:", error);
      toast.error("メニューの取得に失敗しました");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStore();
  }, [params.storeId]);

  useEffect(() => {
    if (store) {
      fetchFoods();
    }
  }, [store]);

  const togglePublish = async (food: Food) => {
    try {
      const { error } = await supabase
        .from("foods")
        .update({ is_published: !food.is_published })
        .eq("id", food.id);

      if (error) throw error;

      await fetchFoods();
      toast.success(
        food.is_published
          ? `「${food.name}」を非公開にしました`
          : `「${food.name}」を公開しました`
      );
    } catch (error) {
      console.error("Error updating publish status:", error);
      toast.error("状態の更新に失敗しました");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) return;

    try {
      const { error } = await supabase.from("foods").delete().eq("id", id);
      if (error) throw error;

      await fetchFoods();
      toast.success(`「${name}」を削除しました`);
    } catch (error) {
      console.error("Error deleting food:", error);
      toast.error("削除に失敗しました");
    }
  };

  const updatePublishDates = async (
    id: number,
    startDate: string | null,
    endDate: string | null
  ) => {
    try {
      const { error } = await supabase
        .from("foods")
        .update({
          publish_start_date: startDate,
          publish_end_date: endDate,
        })
        .eq("id", id);

      if (error) throw error;
      await fetchFoods();
      toast.success("公開期間を更新しました");
    } catch (error) {
      console.error("Error updating publish dates:", error);
      toast.error("公開期間の更新に失敗しました");
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFoods();
  };

  if (loading && !store) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/admin/add-menu"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">店舗選択に戻る</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Store className="w-8 h-8 mr-3 text-blue-600" />
                {store?.name || "店舗名"} - メニュー管理
              </h1>
              <p className="text-gray-600 mt-1">{store?.address}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                更新
              </button>
              <button
                onClick={() =>
                  router.push(`/admin/add-menu/new?storeId=${params.storeId}`)
                }
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="mr-2" size={20} />
                新規メニューの追加
              </button>
            </div>
          </div>
        </div>

        {/* メニュー一覧 */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">メニューを読み込み中...</p>
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow p-8">
              <PlusCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                メニューが登録されていません
              </h3>
              <p className="text-gray-600 mb-4">
                最初のメニューを追加してみましょう
              </p>
              <button
                onClick={() =>
                  router.push(`/admin/add-menu/new?storeId=${params.storeId}`)
                }
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="mr-2" size={20} />
                新規メニューの追加
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              {/* スマートフォン向けカード表示 */}
              <div className="md:hidden">
                {foods.map((food) => (
                  <div key={food.id} className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{food.name}</h3>
                      <span className="text-gray-600">{food.price}円</span>
                    </div>
                    <div className="mb-2 text-sm text-gray-500">
                      カテゴリ: {food.category}
                    </div>
                    <div className="flex items-center mb-2">
                      <button
                        onClick={() => togglePublish(food)}
                        className={`flex items-center ${
                          food.is_published ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {food.is_published ? (
                          <Eye size={18} className="mr-1" />
                        ) : (
                          <EyeOff size={18} className="mr-1" />
                        )}
                        {food.is_published ? "公開中" : "非公開"}
                      </button>
                    </div>
                    <div className="space-y-2 mb-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          開始日時
                        </label>
                        <input
                          type="datetime-local"
                          value={food.publish_start_date?.slice(0, 16) || ""}
                          onChange={(e) =>
                            updatePublishDates(
                              food.id,
                              e.target.value,
                              food.publish_end_date
                            )
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          終了日時
                        </label>
                        <input
                          type="datetime-local"
                          value={food.publish_end_date?.slice(0, 16) || ""}
                          onChange={(e) =>
                            updatePublishDates(
                              food.id,
                              food.publish_start_date,
                              e.target.value
                            )
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2 border-t">
                      <button
                        onClick={() =>
                          router.push(`/admin/add-menu/${food.id}`)
                        }
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={18} className="mr-1" />
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(food.id, food.name)}
                        className="flex items-center text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} className="mr-1" />
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* PC向けテーブル表示 */}
              <table className="min-w-full hidden md:table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 w-1/4">
                      商品名
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 w-20">
                      価格
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 w-24">
                      カテゴリ
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 w-24">
                      状態
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 w-60">
                      公開期間
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 w-32">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {foods.map((food) => (
                    <tr key={food.id}>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center">
                          <img
                            className="h-10 w-10 rounded-full object-cover mr-3 flex-shrink-0"
                            src={food.image_url}
                            alt={food.name}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">
                              {food.name}
                            </div>
                            <div className="text-gray-500 text-xs truncate">
                              {food.description?.substring(0, 50)}
                              {food.description &&
                                food.description.length > 50 &&
                                "..."}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ¥{food.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {food.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => togglePublish(food)}
                          className={`flex items-center text-sm ${
                            food.is_published
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {food.is_published ? (
                            <Eye size={16} className="mr-1" />
                          ) : (
                            <EyeOff size={16} className="mr-1" />
                          )}
                          <span className="hidden lg:inline">
                            {food.is_published ? "公開中" : "非公開"}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2 w-52">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              開始日時
                            </label>
                            <input
                              type="datetime-local"
                              value={
                                food.publish_start_date?.slice(0, 16) || ""
                              }
                              onChange={(e) =>
                                updatePublishDates(
                                  food.id,
                                  e.target.value,
                                  food.publish_end_date
                                )
                              }
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              終了日時
                            </label>
                            <input
                              type="datetime-local"
                              value={food.publish_end_date?.slice(0, 16) || ""}
                              onChange={(e) =>
                                updatePublishDates(
                                  food.id,
                                  food.publish_start_date,
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() =>
                              router.push(`/admin/add-menu/${food.id}`)
                            }
                            className="flex items-center justify-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs transition-colors"
                          >
                            <Edit size={14} className="mr-1" />
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(food.id, food.name)}
                            className="flex items-center justify-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs transition-colors"
                          >
                            <Trash2 size={14} className="mr-1" />
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
