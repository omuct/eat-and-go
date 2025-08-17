"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Store,
} from "lucide-react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { startOfDay, endOfDay, subDays } from "date-fns";
import React from "react";

interface OrderDetail {
  id: string;
  order_id: string;
  food_id: string;
  name: string;
  price: number;
  quantity: number;
  size: "regular" | "large";
  is_takeout: boolean;
  amount: number;
}

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  discount_amount: number;
  payment_method: "cash" | "credit" | "paypay";
  status: "pending" | "cooking" | "ready" | "served";
  created_at: string;
  updated_at: string;
  status_updated_at: string;
  user_name?: string;
  details?: OrderDetail[];
}

interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
}

type DateFilter = "today" | "yesterday" | "last7days" | "last30days" | "custom";

export default function StoreOrderHistoryPage({
  params,
}: {
  params: { storeId: string };
}) {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<
    Record<string, OrderDetail[]>
  >({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // フィルター関連の状態
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ページング関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);

  // 店舗情報を取得
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
      router.push("/admin/order-history");
    }
  };

  // 注文を取得する関数
  const fetchOrders = async () => {
    if (!store) return;

    try {
      setLoading(true);

      // 日付範囲の設定
      let dateStart, dateEnd;

      switch (dateFilter) {
        case "today":
          dateStart = startOfDay(new Date());
          dateEnd = endOfDay(new Date());
          break;
        case "yesterday":
          dateStart = startOfDay(subDays(new Date(), 1));
          dateEnd = endOfDay(subDays(new Date(), 1));
          break;
        case "last7days":
          dateStart = startOfDay(subDays(new Date(), 6));
          dateEnd = endOfDay(new Date());
          break;
        case "last30days":
          dateStart = startOfDay(subDays(new Date(), 29));
          dateEnd = endOfDay(new Date());
          break;
        case "custom":
          dateStart = startOfDay(startDate);
          dateEnd = endOfDay(endDate);
          break;
        default:
          dateStart = startOfDay(new Date());
          dateEnd = endOfDay(new Date());
      }

      // 店舗に関連する商品のIDを取得
      const { data: foods, error: foodsError } = await supabase
        .from("foods")
        .select("id")
        .eq("store_name", store.name);

      if (foodsError) throw foodsError;

      const foodIds = foods?.map((food) => food.id) || [];

      if (foodIds.length === 0) {
        setOrders([]);
        setFilteredOrders([]);
        setLoading(false);
        return;
      }

      // 注文詳細から該当する注文IDを取得
      let orderDetailsQuery = supabase
        .from("order_details")
        .select("order_id")
        .in("food_id", foodIds);

      const { data: orderDetailsData, error: orderDetailsError } =
        await orderDetailsQuery;

      if (orderDetailsError) throw orderDetailsError;

      const orderIds = [
        ...new Set(orderDetailsData?.map((detail) => detail.order_id) || []),
      ];

      if (orderIds.length === 0) {
        setOrders([]);
        setFilteredOrders([]);
        setLoading(false);
        return;
      }

      // 注文データを取得
      let query = supabase
        .from("orders")
        .select("*")
        .in("id", orderIds)
        .gte("created_at", dateStart.toISOString())
        .lte("created_at", dateEnd.toISOString())
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (paymentMethodFilter !== "all") {
        query = query.eq("payment_method", paymentMethodFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // ユーザー名を取得
      const getUserDisplayName = async (userId: string) => {
        if (!userId) return "不明";

        try {
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("id, name")
            .eq("id", userId)
            .maybeSingle();

          if (error || !profileData) {
            return `ユーザー ${userId.substring(0, 6)}`;
          }

          return profileData.name || `ユーザー ${userId.substring(0, 6)}`;
        } catch (e) {
          console.error("予期せぬエラー:", e);
          return `ユーザー ${userId.substring(0, 6)}`;
        }
      };

      // すべての注文に対してユーザー名を取得
      const ordersWithUserInfo = await Promise.all(
        data.map(async (order) => ({
          ...order,
          user_name: await getUserDisplayName(order.user_id),
        }))
      );

      setOrders(ordersWithUserInfo);
      applySearchFilter(ordersWithUserInfo, searchTerm);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("注文履歴の取得に失敗しました");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // 注文詳細を取得する関数
  const fetchOrderDetails = async (orderId: string) => {
    if (!store) return;

    try {
      if (orderDetails[orderId]) {
        return;
      }

      // 店舗に関連する商品のIDを取得
      const { data: foods, error: foodsError } = await supabase
        .from("foods")
        .select("id")
        .eq("store_name", store.name);

      if (foodsError) throw foodsError;

      const foodIds = foods?.map((food) => food.id) || [];

      const { data, error } = await supabase
        .from("order_details")
        .select("*")
        .eq("order_id", orderId)
        .in("food_id", foodIds);

      if (error) throw error;

      setOrderDetails((prev) => ({
        ...prev,
        [orderId]: data || [],
      }));
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("注文詳細の取得に失敗しました");
    }
  };

  // 注文の詳細を表示/非表示を切り替える関数
  const toggleOrderDetails = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      await fetchOrderDetails(orderId);
    }
  };

  // 注文ステータスを更新する関数
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      // ローカルの状態を更新
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus as any,
                status_updated_at: new Date().toISOString(),
              }
            : order
        )
      );

      setFilteredOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus as any,
                status_updated_at: new Date().toISOString(),
              }
            : order
        )
      );

      toast.success(
        `注文ID: ${orderId.substring(0, 8)}... のステータスを「${getStatusLabel(newStatus)}」に更新しました`
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("ステータスの更新に失敗しました");
    }
  };

  // ステータスの日本語表示
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "受付済み";
      case "cooking":
        return "調理中";
      case "ready":
        return "調理済み";
      case "served":
        return "提供済み";
      default:
        return status;
    }
  };

  // ステータスに応じた色を返す関数
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cooking":
        return "bg-orange-100 text-orange-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "served":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 検索フィルターを適用する関数
  const applySearchFilter = (ordersList: Order[], term: string) => {
    if (!term.trim()) {
      setFilteredOrders(ordersList);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const filtered = ordersList.filter(
      (order) =>
        order.id.toLowerCase().includes(lowerTerm) ||
        (order.user_name?.toLowerCase() || "").includes(lowerTerm) ||
        order.status.toLowerCase().includes(lowerTerm)
    );

    setFilteredOrders(filtered);
  };

  // フィルターリセット
  const resetFilters = () => {
    setStatusFilter("all");
    setPaymentMethodFilter("all");
    setDateFilter("today");
    setSearchTerm("");
    fetchOrders();
  };

  // 更新ボタンのハンドラー
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  // 現在のページの注文を取得
  const getCurrentOrders = () => {
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  };

  // ページ数を計算
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // 初回マウント時に店舗情報を取得
  useEffect(() => {
    fetchStore();
  }, [params.storeId]);

  // 店舗情報取得後に注文データを取得
  useEffect(() => {
    if (store) {
      fetchOrders();
    }
  }, [store, dateFilter, statusFilter, paymentMethodFilter]);

  // 検索語が変更されたときにフィルターを適用
  useEffect(() => {
    applySearchFilter(orders, searchTerm);
  }, [searchTerm, orders]);

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
            href="/admin/order-history"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">店舗選択に戻る</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Store className="w-8 h-8 mr-3 text-blue-600" />
                {store?.name || "店舗名"} - 注文履歴
              </h1>
              <p className="text-gray-600 mt-1">{store?.address}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              更新
            </button>
          </div>
        </div>

        {/* フィルター部分 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                検索
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="注文ID、ユーザー名で検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* ステータスフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="pending">受付済み</option>
                <option value="cooking">調理中</option>
                <option value="ready">調理済み</option>
                <option value="served">提供済み</option>
              </select>
            </div>

            {/* 支払方法フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払方法
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="cash">現金</option>
                <option value="credit">クレジット</option>
                <option value="paypay">PayPay</option>
              </select>
            </div>

            {/* 日付フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期間
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">今日</option>
                <option value="yesterday">昨日</option>
                <option value="last7days">過去7日間</option>
                <option value="last30days">過去30日間</option>
                <option value="custom">カスタム</option>
              </select>
            </div>

            {/* リセットボタン */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                リセット
              </button>
            </div>
          </div>

          {/* カスタム日付範囲 */}
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={startDate.toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={endDate.toISOString().split("T")[0]}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 注文一覧 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">注文履歴を読み込み中...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all" || dateFilter !== "today"
                  ? "条件に一致する注文が見つかりませんでした"
                  : "注文履歴がありません"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注文ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      金額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      支払方法
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注文日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentOrders().map((order) => (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ¥{order.total_amount.toLocaleString()}
                          {order.discount_amount > 0 && (
                            <span className="text-green-600 text-xs ml-1">
                              (-¥{order.discount_amount})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.payment_method === "cash"
                            ? "現金"
                            : order.payment_method === "credit"
                              ? "クレジット"
                              : order.payment_method === "paypay"
                                ? "PayPay"
                                : order.payment_method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value)
                            }
                            className={`px-2 py-1 text-xs font-semibold rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(
                              order.status
                            )}`}
                          >
                            <option value="pending">受付済み</option>
                            <option value="cooking">調理中</option>
                            <option value="ready">調理済み</option>
                            <option value="served">提供済み</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleOrderDetails(order.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            詳細
                            {expandedOrderId === order.id ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* 注文詳細の展開行 */}
                      {expandedOrderId === order.id && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="max-w-3xl mx-auto">
                              <h4 className="text-lg font-medium text-gray-900 mb-3">
                                注文詳細
                              </h4>
                              {orderDetails[order.id] &&
                              orderDetails[order.id].length > 0 ? (
                                <div className="space-y-2">
                                  {orderDetails[order.id].map((detail) => (
                                    <div
                                      key={detail.id}
                                      className="flex justify-between items-center bg-white p-3 rounded border"
                                    >
                                      <div>
                                        <span className="font-medium">
                                          {detail.name}
                                        </span>
                                        <span className="text-gray-500 ml-2">
                                          {detail.size === "large"
                                            ? "(大盛り)"
                                            : "(普通)"}
                                        </span>
                                        <span className="text-gray-500 ml-2">
                                          {detail.is_takeout
                                            ? "テイクアウト"
                                            : "イートイン"}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <div>数量: {detail.quantity}</div>
                                        <div className="font-medium">
                                          ¥{detail.amount.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500">
                                  詳細情報を読み込み中...
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredOrders.length} 件中{" "}
              {(currentPage - 1) * ordersPerPage + 1} -{" "}
              {Math.min(currentPage * ordersPerPage, filteredOrders.length)}{" "}
              件を表示
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                前へ
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
