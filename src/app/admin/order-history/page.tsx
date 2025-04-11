"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Calendar,
  Search,
  Check,
  MoreHorizontal,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React from "react";
import router from "next/router";

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
  payment_method: "cash" | "credit";
  status: "pending" | "cooking" | "ready" | "served";
  created_at: string;
  updated_at: string;
  status_updated_at: string;
  user_name?: string; // 名前のみを表示するためのフィールド
  details?: OrderDetail[];
}

type DateFilter = "today" | "yesterday" | "last7days" | "last30days" | "custom";

export default function OrderHistoryPage() {
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
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ページング関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);

  // 注文を取得する関数
  const fetchOrders = async () => {
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

      // 注文データを取得
      let query = supabase
        .from("orders")
        .select("*")
        .gte("created_at", dateStart.toISOString())
        .lte("created_at", dateEnd.toISOString())
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      async function getUserDisplayName(userId: string) {
        if (!userId) return "不明";

        try {
          // 存在するカラムのみ選択
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("id, name") // nameのみ選択 (emailとusernameは存在しない)
            .eq("id", userId)
            .maybeSingle();

          if (error) {
            console.error("プロファイル取得エラー:", error);
            return "ユーザー情報なし";
          }

          // データが見つからない場合
          if (!profileData) {
            return `ユーザー ${userId.substring(0, 6)}`;
          }

          // 名前があればそれを表示
          if (profileData.name) {
            return profileData.name;
          }

          // 名前がnullまたは空の場合はIDの一部を使用
          return `ユーザー ${userId.substring(0, 6)}`;
        } catch (e) {
          console.error("予期せぬエラー:", e);
          return `ユーザー ${userId.substring(0, 6)}`;
        }
      }

      // 管理者かどうかを確認する関数
      async function checkIsAdmin(userId: any) {
        try {
          const { data, error } = await supabase.rpc("check_is_admin", {
            user_id: userId,
          });
          // または直接RLSが適用されないSQL関数を呼び出す
          return error ? false : !!data;
        } catch (e) {
          console.error("管理者権限チェックエラー:", e);
          return false;
        }
      }

      // すべての注文に対してユーザー名を取得
      const ordersWithUserInfo = await Promise.all(
        data.map(async (order) => ({
          ...order,
          user_name: await getUserDisplayName(order.user_id), // 名前のみを取得
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
    try {
      if (orderDetails[orderId]) {
        // すでに取得済みの場合は何もしない
        return;
      }

      console.log(`注文詳細を取得中: ${orderId}`);

      const { data, error } = await supabase
        .from("order_details")
        .select("*")
        .eq("order_id", orderId);

      if (error) {
        console.error("注文詳細取得エラー:", error);
        throw error;
      }

      console.log(`取得した注文詳細:`, data);

      if (!data || data.length === 0) {
        toast.info("この注文の詳細情報はありません");
      }

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

  // 初回マウント時と依存する状態が変化したときに注文データを取得
  useEffect(() => {
    fetchOrders();
  }, [dateFilter, statusFilter]);

  // 検索語が変更されたときにフィルターを適用
  useEffect(() => {
    applySearchFilter(orders, searchTerm);
  }, [searchTerm, orders]);

  // supabaseClientの初期化後に以下のコードを実行
  const checkAndRefreshSession = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      // セッションがない場合はログインページにリダイレクト
      console.error("認証エラー:", error);
      router.push("/login");
      return false;
    }

    return true;
  };

  // 各ページでセッションをチェック
  useEffect(() => {
    checkAndRefreshSession();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">注文履歴</h1>
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            更新
          </button>
        </div>

        {/* フィルター部分 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索フィールド */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                検索
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="注文ID、顧客名など"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* ステータスフィルター */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">すべて</option>
                <option value="pending">受付済み</option>
                <option value="cooking">調理中</option>
                <option value="ready">調理済み</option>
                <option value="served">提供済み</option>
              </select>
            </div>

            {/* 日付フィルター */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                期間
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">今日</option>
                <option value="yesterday">昨日</option>
                <option value="last7days">過去7日間</option>
                <option value="last30days">過去30日間</option>
                <option value="custom">カスタム期間</option>
              </select>
            </div>

            {/* リセットボタン */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                フィルターをリセット
              </button>
            </div>
          </div>

          {/* カスタム日付範囲 */}
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  開始日
                </label>
                <input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  終了日
                </label>
                <input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 注文一覧 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p>注文履歴を読み込み中...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <p>該当する注文がありません</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      詳細
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注文ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顧客名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注文日時
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
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentOrders().map((order) => (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleOrderDetails(order.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ChevronDown
                              className={`w-5 h-5 transition-transform ${
                                expandedOrderId === order.id
                                  ? "transform rotate-180"
                                  : ""
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {order.user_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ¥{order.total_amount.toLocaleString()}
                          </div>
                          {order.discount_amount > 0 && (
                            <div className="text-xs text-green-600">
                              (割引: ¥{order.discount_amount.toLocaleString()})
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {order.payment_method === "cash"
                              ? "現金"
                              : "クレジットカード"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <select
                              className="border border-gray-300 rounded-md text-sm py-1 px-2"
                              value={order.status}
                              onChange={(e) =>
                                updateOrderStatus(order.id, e.target.value)
                              }
                            >
                              <option value="pending">受付済み</option>
                              <option value="cooking">調理中</option>
                              <option value="ready">調理済み</option>
                              <option value="served">提供済み</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                      {expandedOrderId === order.id && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            {orderDetails[order.id] ? (
                              <div className="space-y-3">
                                <h3 className="font-medium">注文詳細</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {orderDetails[order.id].map((detail) => (
                                    <div
                                      key={detail.id}
                                      className="bg-white rounded-lg border border-gray-200 p-3 flex items-start"
                                    >
                                      <div className="flex-grow">
                                        <div className="font-medium">
                                          {detail.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {detail.size === "large"
                                            ? "大盛り"
                                            : "普通"}{" "}
                                          /
                                          {detail.is_takeout
                                            ? "テイクアウト"
                                            : "イートイン"}
                                        </div>
                                        <div className="mt-1">
                                          <span className="font-medium">
                                            ¥{detail.price.toLocaleString()}
                                          </span>
                                          <span className="text-sm text-gray-500">
                                            {" "}
                                            × {detail.quantity}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-lg font-bold">
                                        {detail.quantity}個
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                                詳細を読み込み中...
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        全
                        <span className="font-medium">
                          {" "}
                          {filteredOrders.length}{" "}
                        </span>
                        件中
                        <span className="font-medium">
                          {" "}
                          {(currentPage - 1) * ordersPerPage + 1}{" "}
                        </span>
                        -
                        <span className="font-medium">
                          {Math.min(
                            currentPage * ordersPerPage,
                            filteredOrders.length
                          )}
                        </span>
                        件を表示
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">前へ</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        {/* ページ番号 */}
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">次へ</span>
                          <ChevronRight
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
