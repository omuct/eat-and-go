"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Store, ShoppingBag } from "lucide-react";
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

interface StoreOrderStats {
  store_id: number;
  store_name: string;
  total_orders: number;
  today_orders: number;
  pending_orders: number;
}

export default function OrderHistoryStorePage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [orderStats, setOrderStats] = useState<StoreOrderStats[]>([]);
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
      await fetchOrderStats(storesData);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("店舗情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStats = async (storesData: Store[]) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats: StoreOrderStats[] = [];

      // 各店舗の統計を取得
      for (const store of storesData) {
        // 店舗に関連する商品のIDを取得
        const { data: foods, error: foodsError } = await supabase
          .from("foods")
          .select("id")
          .eq("store_name", store.name);

        if (foodsError) {
          console.error(
            `Error fetching foods for store ${store.name}:`,
            foodsError
          );
          continue;
        }

        const foodIds = foods?.map((food) => food.id) || [];

        if (foodIds.length === 0) {
          stats.push({
            store_id: store.id,
            store_name: store.name,
            total_orders: 0,
            today_orders: 0,
            pending_orders: 0,
          });
          continue;
        }

        // 総注文数
        const { count: totalCount, error: totalError } = await supabase
          .from("order_details")
          .select("*", { count: "exact", head: true })
          .in("food_id", foodIds);

        // 今日の注文数
        const { count: todayCount, error: todayError } = await supabase
          .from("order_details")
          .select("orders!inner(*)", { count: "exact", head: true })
          .in("food_id", foodIds)
          .gte("orders.created_at", today.toISOString())
          .lt("orders.created_at", tomorrow.toISOString());

        // 保留中の注文数
        const { count: pendingCount, error: pendingError } = await supabase
          .from("order_details")
          .select("orders!inner(*)", { count: "exact", head: true })
          .in("food_id", foodIds)
          .in("orders.status", ["pending", "cooking"]);

        if (totalError || todayError || pendingError) {
          console.error(`Error fetching stats for store ${store.name}`);
          continue;
        }

        stats.push({
          store_id: store.id,
          store_name: store.name,
          total_orders: totalCount || 0,
          today_orders: todayCount || 0,
          pending_orders: pendingCount || 0,
        });
      }

      setOrderStats(stats);
    } catch (error) {
      console.error("Error fetching order stats:", error);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const getStoreStats = (storeId: number) => {
    return (
      orderStats.find((stat) => stat.store_id === storeId) || {
        store_id: storeId,
        store_name: "",
        total_orders: 0,
        today_orders: 0,
        pending_orders: 0,
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
                <ShoppingBag className="w-8 h-8 mr-3 text-blue-600" />
                注文管理
              </h1>
              <p className="text-gray-600 mt-1">店舗を選択して注文履歴を確認</p>
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
                onClick={() => router.push(`/admin/order-history/${store.id}`)}
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

                {/* 注文統計 */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {stats.total_orders}
                    </p>
                    <p className="text-xs text-gray-500">総注文数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">
                      {stats.today_orders}
                    </p>
                    <p className="text-xs text-gray-500">今日の注文</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-600">
                      {stats.pending_orders}
                    </p>
                    <p className="text-xs text-gray-500">処理中</p>
                  </div>
                </div>

                {/* 管理ボタン */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-center text-blue-600 font-medium group-hover:text-blue-700">
                    <span>注文履歴を確認</span>
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
              まず店舗を登録してから注文管理を行ってください
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
