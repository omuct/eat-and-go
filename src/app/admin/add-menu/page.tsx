// src/app/admin/add-menu/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Store, PlusCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
  description?: string;
  image_url?: string;
}

interface MenuStats {
  store_id: number;
  store_name: string;
  total_menus: number;
  published_menus: number;
  unpublished_menus: number;
}

export default function MenuManagementStorePage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [menuStats, setMenuStats] = useState<MenuStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) throw error;

      const storesData = (data || []).map((store: any) => ({
        id: Number(store.id),
        name: String(store.store_name || store.name || ""),
        address: String(store.address || ""),
        phone: String(store.phone || ""),
        opening_hours: String(store.opening_hours || ""),
        description: store.description ? String(store.description) : undefined,
        image_url: store.image_url ? String(store.image_url) : undefined,
      }));

      setStores(storesData);
      await fetchMenuStats(storesData);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("店舗情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuStats = async (storesData: Store[]) => {
    try {
      const stats: MenuStats[] = [];

      // 各店舗のメニュー統計を取得
      for (const store of storesData) {
        // 総メニュー数
        const { count: totalCount, error: totalError } = await supabase
          .from("foods")
          .select("*", { count: "exact", head: true })
          .eq("store_name", store.name);

        // 公開中メニュー数
        const { count: publishedCount, error: publishedError } = await supabase
          .from("foods")
          .select("*", { count: "exact", head: true })
          .eq("store_name", store.name)
          .eq("is_published", true);

        // 非公開メニュー数
        const { count: unpublishedCount, error: unpublishedError } =
          await supabase
            .from("foods")
            .select("*", { count: "exact", head: true })
            .eq("store_name", store.name)
            .eq("is_published", false);

        if (totalError || publishedError || unpublishedError) {
          console.error(`Error fetching stats for store ${store.name}`);
          continue;
        }

        stats.push({
          store_id: store.id,
          store_name: store.name,
          total_menus: totalCount || 0,
          published_menus: publishedCount || 0,
          unpublished_menus: unpublishedCount || 0,
        });
      }

      setMenuStats(stats);
    } catch (error) {
      console.error("Error fetching menu stats:", error);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const getStoreStats = (storeId: number) => {
    return (
      menuStats.find((stat) => stat.store_id === storeId) || {
        store_id: storeId,
        store_name: "",
        total_menus: 0,
        published_menus: 0,
        unpublished_menus: 0,
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">店舗情報を読み込み中...</p>
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
            href="/admin"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">管理者画面に戻る</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Store className="w-8 h-8 mr-3 text-blue-600" />
                メニュー管理
              </h1>
              <p className="text-gray-600 mt-1">店舗を選択してメニューを管理</p>
            </div>
          </div>
        </div>

        {/* 店舗一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => {
            const stats = getStoreStats(store.id);
            return (
              <div
                key={store.id}
                onClick={() => router.push(`/admin/add-menu/store/${store.id}`)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
              >
                {/* 店舗画像 */}
                {store.image_url ? (
                  <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
                    <img
                      src={store.image_url}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 mb-4 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Store className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                {/* 店舗情報 */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {store.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">{store.address}</p>
                  <p className="text-sm text-gray-600">{store.opening_hours}</p>
                </div>

                {/* メニュー統計 */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {stats.total_menus}
                    </p>
                    <p className="text-xs text-gray-500">総メニュー数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">
                      {stats.published_menus}
                    </p>
                    <p className="text-xs text-gray-500">公開中</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-600">
                      {stats.unpublished_menus}
                    </p>
                    <p className="text-xs text-gray-500">非公開</p>
                  </div>
                </div>

                {/* 管理ボタン */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-center text-blue-600 font-medium group-hover:text-blue-700">
                    <span>メニューを管理</span>
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {stores.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              店舗が登録されていません
            </h3>
            <p className="text-gray-600 mb-4">
              まず店舗を登録してからメニュー管理を行ってください
            </p>
            <Link
              href="/admin/shops"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              店舗管理に移動
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
