"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Store,
  Printer,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { startOfDay, endOfDay, subDays } from "date-fns";
import React from "react";
// @ts-ignore
import QRCode from "qrcode";
import axios from "axios";

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
  order_number?: string; // 追加
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
  const { user, canAccessStore } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // フィルター関連の状態
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ページング関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);

  // 印刷回数を追跡するstate
  const [printCounts, setPrintCounts] = useState<{ [orderId: string]: number }>(
    {}
  );

  // 商品の分別カテゴリを取得する関数
  const getWasteCategories = (orderDetails: OrderDetail[]) => {
    // 商品名から分別を推定（実際のアプリでは商品マスタから取得）
    const wasteCategories = new Set<string>();

    orderDetails.forEach((detail) => {
      const name = detail.name.toLowerCase();
      if (
        name.includes("ペットボトル") ||
        name.includes("ドリンク") ||
        name.includes("お茶")
      ) {
        wasteCategories.add("ペットボトル");
      } else if (name.includes("缶") || name.includes("ビール")) {
        wasteCategories.add("缶・びん");
      } else {
        wasteCategories.add("燃えるゴミ");
      }
    });

    return Array.from(wasteCategories);
  };

  // QRコードデータを生成する関数
  const generateQRCodeData = (order: Order) => {
    const wasteCategories = getWasteCategories(order.details || []);

    const qrData = {
      orderId: order.id,
      orderNumber: order.order_number || `#${order.id.substring(0, 8)}`,
      userId: order.user_id,
      userName: order.user_name || "ゲスト",
      wasteCategories: wasteCategories,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      storeId: params.storeId,
      items:
        order.details?.map((detail) => ({
          name: detail.name,
          quantity: detail.quantity,
          takeout: detail.is_takeout,
        })) || [],
    };

    return JSON.stringify(qrData);
  };

  // QRコード画像を生成する関数
  const generateQRCodeImage = async (data: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error("QRコード生成エラー:", error);
      return "";
    }
  };

  // 印刷機能の実装（即座に印刷実行）
  const handlePrintOrder = async (orderId: string, orderStatus: string) => {
    // 調理済み（ready）と提供済み（served）の場合のみ印刷可能
    if (orderStatus !== "ready" && orderStatus !== "served") {
      toast.warning(`注文 ${orderId.substring(0, 8)}... はまだ調理中です`);
      return;
    }

    try {
      // 注文データを取得
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        toast.error("注文情報が見つかりません");
        return;
      }

      // 注文詳細が不足している場合は再取得
      if (!order.details || order.details.length === 0) {
        const { data: orderWithDetails, error } = await supabase
          .from("orders")
          .select(
            `
            *,
            order_details (
              id,
              food_id,
              name,
              price,
              quantity,
              size,
              is_takeout,
              amount
            ),
            profiles (
              name
            )
          `
          )
          .eq("id", orderId)
          .single();

        if (error) {
          console.error("注文詳細取得エラー:", error);
          toast.error("注文詳細の取得に失敗しました");
          return;
        }

        order.details = orderWithDetails.order_details || [];
        order.user_name = orderWithDetails.profiles?.name || "ゲスト";
      }

      // 印刷回数を更新
      const currentPrintCount = printCounts[orderId] || 0;
      const newPrintCount = currentPrintCount + 1;
      setPrintCounts((prev) => ({ ...prev, [orderId]: newPrintCount }));

      // QRコードデータを生成
      const qrData = generateQRCodeData(order);
      const qrImage = await generateQRCodeImage(qrData);

      // 即座に印刷実行（印刷回数を渡す）
      executePrintDirect(order, qrImage, newPrintCount);
    } catch (error) {
      console.error("印刷処理エラー:", error);
      toast.error("印刷処理中にエラーが発生しました");
    }
  };

  // 直接印刷を実行する関数（プレビューなし）
  const executePrintDirect = (
    order: Order,
    qrCodeDataUrl: string,
    printCount: number
  ) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("印刷ウィンドウを開けませんでした");
      return;
    }

    // 注文番号
    const baseOrderNumber =
      order.order_number || `#${order.id.substring(0, 8)}`;

    // 各商品を数量分に展開して個別のラベルを作成
    const printLabels: Array<{
      name: string;
      orderNumber: string;
      totalQuantity: number;
      currentLabel: number;
    }> = [];

    order.details?.forEach((detail) => {
      // 商品の数量分だけラベルを作成
      for (let i = 1; i <= detail.quantity; i++) {
        printLabels.push({
          name: detail.name,
          orderNumber: baseOrderNumber,
          totalQuantity: detail.quantity,
          currentLabel: i,
        });
      }
    });

    // 各ラベルごとに印刷HTMLを生成（62mm幅、QRコード最大化）
    const printPages = printLabels
      .map(
        (label, index) => `
    <div class="print-page" ${index > 0 ? 'style="page-break-before: always;"' : ""}>
      <div class="print-container">
        
        <!-- 店舗名 -->
        <div class="store-name">
          ${store?.name || "学食"}
        </div>
        
        <!-- 注文番号 -->
        <div class="order-number">
          ${
            printCount > 1 ? `${label.orderNumber} (再印刷)` : label.orderNumber
          }
        </div>
        
        <!-- 商品名 -->
        <div class="item-name">
          ${label.name}
        </div>
        
        <!-- 数量（複数個の場合のみ表示） -->
        ${
          label.totalQuantity > 1
            ? `<div class="quantity">${label.currentLabel}/${label.totalQuantity}個目</div>`
            : ""
        }
        
        <!-- QRコード（大きく表示） -->
        <div class="qr-section">
          <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
        </div>
        
      </div>
    </div>
  `
      )
      .join("");

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>注文票 - ${baseOrderNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            background: white;
            font-size: 10px;
            color: #000;
          }
          
          /* 62mm幅の印刷設定（1ページに収める） */
          .print-page {
            width: 62mm;
            height: 100mm;
            display: flex;
            flex-direction: column;
            page-break-after: always;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          
          /* コンテナ */
          .print-container {
            width: 100%;
            height: 100%;
            padding: 3mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
          }

          /* 上部情報エリア */
          .store-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 2mm;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
            width: 100%;
          }
          
          .order-number {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          
          .item-name {
            font-size: 10px;
            font-weight: bold;
            word-wrap: break-word;
            line-height: 1.3;
            margin-bottom: 2mm;
            width: 100%;
            max-height: 15mm;
            overflow: hidden;
          }
          
          .quantity {
            font-size: 9px;
            color: #666;
            margin-bottom: 2mm;
            padding: 1mm;
            border: 1px solid #ccc;
            border-radius: 2px;
            display: inline-block;
          }

          /* QRコード（可能な限り大きく） */
          .qr-section {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 2mm 0;
          }
          
          .qr-code {
            width: 45mm;
            height: 45mm;
            max-width: 45mm;
            max-height: 45mm;
            border: 2px solid #000;
          }

          /* 印刷設定（62mm × 100mm固定） */
          @media print {
            body { 
              margin: 0; 
              padding: 0;
              color: #000 !important;
            }
            .print-page {
              width: 62mm;
              height: 100mm;
            }
            @page {
              size: 62mm 100mm;
              margin: 0;
            }
            
            /* QRコード印刷設定 */
            .qr-code {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        ${printPages}
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    // 印刷実行
    setTimeout(() => {
      printWindow.print();

      // 印刷完了後にウィンドウを閉じる
      setTimeout(() => {
        printWindow.close();
      }, 1000);

      // 印刷完了メッセージ
      const totalLabels = printLabels.length;
      const printMessage =
        printCount > 1
          ? `注文票を再印刷しました (${printCount}回目) - ${totalLabels}枚のラベル`
          : `注文票を印刷しました - ${totalLabels}枚のラベル`;
      toast.success(printMessage);
    }, 500);
  };

  // 印刷ボタンに印刷回数を表示
  const getPrintButtonText = (orderId: string) => {
    const printCount = printCounts[orderId] || 0;
    return printCount > 0 ? `印刷 (${printCount})` : "印刷";
  };

  // 印刷ボタンのツールチップテキストを生成
  const getPrintButtonTooltip = (orderId: string, orderStatus: string) => {
    const printCount = printCounts[orderId] || 0;

    if (orderStatus !== "ready" && orderStatus !== "served") {
      return "調理完了後に印刷できます";
    }

    if (printCount > 0) {
      return `注文票を再印刷 (${printCount}回印刷済み)`;
    }

    return "注文票を印刷";
  };

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

  // 注文を取得する関数を修正
  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log("=== fetchOrders 開始 ===");
      console.log("店舗ID:", params.storeId);
      console.log("店舗データ:", store);
      console.log("日付フィルター:", dateFilter);
      console.log("ステータスフィルター:", statusFilter);

      // 基本的なクエリを構築
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          order_details (
            id,
            food_id,
            name,
            price,
            quantity,
            size,
            is_takeout,
            amount
          ),
          profiles (
            name
          )
        `
        )
        .eq("store_id", parseInt(params.storeId))
        .order("created_at", { ascending: false });

      console.log("基本クエリ構築完了");

      // まず日付フィルターなしでデータを取得してみる
      console.log("=== 日付フィルターなしでデータ取得テスト ===");
      const { data: allData, error: allError } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", parseInt(params.storeId));

      if (allError) {
        console.error("全データ取得エラー:", allError);
      } else {
        console.log("店舗の全注文データ:", allData?.length, "件");
        console.log(
          "全注文の作成日時:",
          allData?.map((o) => o.created_at)
        );
      }

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
          if (!customStartDate || !customEndDate) {
            console.log("カスタム日付が設定されていません:", {
              customStartDate,
              customEndDate,
            });
            // デフォルトで今日のデータを取得
            dateStart = startOfDay(new Date());
            dateEnd = endOfDay(new Date());
          } else {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              toast.error("有効な日付を入力してください");
              setLoading(false);
              return;
            }

            if (startDate > endDate) {
              toast.error("開始日は終了日より前の日付を設定してください");
              setLoading(false);
              return;
            }

            dateStart = startOfDay(startDate);
            dateEnd = endOfDay(endDate);
          }
          break;
        default:
          dateStart = startOfDay(new Date());
          dateEnd = endOfDay(new Date());
      }

      console.log("日付範囲:", {
        dateFilter,
        dateStart: dateStart?.toISOString(),
        dateEnd: dateEnd?.toISOString(),
        現在時刻: new Date().toISOString(),
      });

      // 日付フィルターを適用
      if (
        dateStart &&
        dateEnd &&
        !isNaN(dateStart.getTime()) &&
        !isNaN(dateEnd.getTime())
      ) {
        query = query
          .gte("created_at", dateStart.toISOString())
          .lte("created_at", dateEnd.toISOString());
      }

      // ステータスフィルターを適用
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
        console.log("ステータスフィルター適用:", statusFilter);
      }

      console.log("最終クエリ実行");
      const { data, error } = await query;

      if (error) {
        console.error("注文履歴の取得に失敗しました:", error);
        toast.error("注文履歴の取得に失敗しました");
        return;
      }

      console.log("フィルター後の取得データ:", data?.length, "件");
      console.log("取得した注文データの詳細:", data);

      const formattedOrders =
        data?.map((order: any) => ({
          ...order,
          user_name: order.profiles?.name || "ゲスト",
          details: order.order_details || [],
        })) || [];

      console.log("フォーマット後の注文数:", formattedOrders.length);
      setOrders(formattedOrders);
    } catch (error) {
      console.error("注文履歴の取得中にエラーが発生しました:", error);
      toast.error("注文履歴の取得中にエラーが発生しました");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      console.log("=== fetchOrders 終了 ===");
    }
  };

  // 注文の詳細を表示/非表示を切り替える関数
  const toggleOrderDetails = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
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

      toast.success(
        `注文ID: ${orderId.substring(0, 8)}... のステータスを「${getStatusLabel(
          newStatus
        )}」に更新しました`
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("ステータスの更新に失敗しました");
    }
  };

  // 「調理完了」ボタンが押されたときの専用処理
  const handleMarkAsReady = async (orderId: string) => {
    try {
      // --- ここからが前回の成功パターンです ---
      // 1. 現在のセッションからアクセストークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("認証情報が見つかりません。再ログインしてください。");
        return;
      }

      // 2. 新しいAPIを、認証ヘッダーを付けて呼び出す
      const response = await axios.post(
        "/api/orders/mark-as-ready",
        { orderId },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      // --- ここまで ---

      if (response.data.success) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: "ready" as const,
                  status_updated_at: new Date().toISOString(),
                }
              : order
          )
        );
        toast.success(
          `注文ID: ${orderId.substring(0, 8)}... の準備が完了し、お客様に通知しました`
        );
      } else {
        throw new Error(response.data.error || "APIエラー");
      }
    } catch (error) {
      console.error("Error marking order as ready:", error);
      toast.error("準備完了の処理に失敗しました");
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
      setOrders(ordersList);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const filtered = ordersList.filter(
      (order) =>
        order.id.toLowerCase().includes(lowerTerm) ||
        (order.user_name?.toLowerCase() || "").includes(lowerTerm) ||
        order.status.toLowerCase().includes(lowerTerm)
    );

    setOrders(filtered);
  };

  // フィルターリセット
  const resetFilters = () => {
    setStatusFilter("all");
    setDateFilter("today");
    setSearchTerm("");
    setCustomStartDate("");
    setCustomEndDate("");
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
    return orders.slice(indexOfFirstOrder, indexOfLastOrder);
  };

  // ページ数を計算
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  // 初回マウント時に店舗情報を取得
  useEffect(() => {
    fetchStore();
  }, [params.storeId]);

  // 店舗情報取得後に注文データを取得
  useEffect(() => {
    if (store) {
      fetchOrders();
    }
  }, [store, dateFilter, statusFilter]);

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

            {/* 支払方法フィルター削除済み */}

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
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 注文一覧テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">注文履歴を読み込み中...</p>
            </div>
          ) : orders.length === 0 ? (
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
                      注文番号・ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顧客名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注文日時
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      印刷
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      合計金額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      支払方法
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentOrders().map((order) => (
                    <React.Fragment key={order.id}>
                      {/* メインの注文行 */}
                      <tr
                        className={
                          expandedOrder === order.id ? "bg-blue-50" : ""
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {order.order_number ||
                                `#${order.id.substring(0, 8)}`}
                              {printCounts[order.id] > 0 && (
                                <span className="text-red-600 text-xs ml-1">
                                  (印刷済み: {printCounts[order.id]}回)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {order.id.substring(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.user_name || "ゲスト"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>
                              {new Date(order.created_at).toLocaleDateString(
                                "ja-JP"
                              )}
                            </div>
                            <div className="text-xs">
                              {new Date(order.created_at).toLocaleTimeString(
                                "ja-JP",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <button
                              onClick={() =>
                                handlePrintOrder(order.id, order.status)
                              }
                              className={`inline-flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                                order.status === "ready" ||
                                order.status === "served"
                                  ? "bg-green-100 text-green-700 hover:bg-green-200 hover:scale-110 shadow-sm"
                                  : "bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-not-allowed"
                              }`}
                              title={getPrintButtonTooltip(
                                order.id,
                                order.status
                              )}
                              disabled={
                                order.status !== "ready" &&
                                order.status !== "served"
                              }
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {printCounts[order.id] > 0 && (
                              <span className="text-xs text-gray-500">
                                {printCounts[order.id]}回
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          ¥{order.total_amount.toLocaleString()}
                          {order.discount_amount > 0 && (
                            <div className="text-xs text-green-600">
                              -¥{order.discount_amount.toLocaleString()} 割引
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.payment_method === "cash"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.payment_method === "cash"
                              ? "現金"
                              : "PayPay"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleOrderDetails(order.id)}
                              className="text-blue-600 hover:text-blue-900 transition-colors flex items-center"
                            >
                              {expandedOrder === order.id ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  閉じる
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  詳細
                                </>
                              )}
                            </button>

                            {/* ステータス更新ボタン */}
                            {order.status === "pending" && (
                              <button
                                onClick={() =>
                                  updateOrderStatus(order.id, "cooking")
                                }
                                className="text-orange-600 hover:text-orange-900 transition-colors"
                              >
                                調理開始
                              </button>
                            )}
                            {order.status === "cooking" && (
                              <button
                                onClick={
                                  () => handleMarkAsReady(order.id) // updateOrderStatus から handleMarkAsReady へ
                                }
                                className="text-green-600 hover:text-green-900 transition-colors"
                              >
                                調理完了
                              </button>
                            )}
                            {order.status === "ready" && (
                              <button
                                onClick={() =>
                                  updateOrderStatus(order.id, "served")
                                }
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                              >
                                提供完了
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* 詳細表示行 */}
                      {expandedOrder === order.id && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900 text-lg mb-3">
                                注文詳細
                              </h4>

                              {/* 基本情報 */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-3 rounded-lg border">
                                  <h5 className="font-medium text-gray-700 mb-2">
                                    基本情報
                                  </h5>
                                  <div className="space-y-1 text-sm">
                                    <p>
                                      <span className="font-medium">
                                        注文ID:
                                      </span>{" "}
                                      {order.id}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        注文番号:
                                      </span>{" "}
                                      {order.order_number ||
                                        `#${order.id.substring(0, 8)}`}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        ユーザーID:
                                      </span>{" "}
                                      {order.user_id}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        注文日時:
                                      </span>{" "}
                                      {new Date(
                                        order.created_at
                                      ).toLocaleString("ja-JP")}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        更新日時:
                                      </span>{" "}
                                      {new Date(
                                        order.updated_at
                                      ).toLocaleString("ja-JP")}
                                    </p>
                                    {order.status_updated_at && (
                                      <p>
                                        <span className="font-medium">
                                          ステータス更新:
                                        </span>{" "}
                                        {new Date(
                                          order.status_updated_at
                                        ).toLocaleString("ja-JP")}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-lg border">
                                  <h5 className="font-medium text-gray-700 mb-2">
                                    支払情報
                                  </h5>
                                  <div className="space-y-1 text-sm">
                                    <p>
                                      <span className="font-medium">
                                        支払方法:
                                      </span>
                                      <span
                                        className={`ml-2 px-2 py-1 rounded text-xs ${
                                          order.payment_method === "cash"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        {order.payment_method === "cash"
                                          ? "現金"
                                          : "PayPay"}
                                      </span>
                                    </p>
                                    <p>
                                      <span className="font-medium">小計:</span>{" "}
                                      ¥
                                      {(
                                        order.total_amount +
                                        order.discount_amount
                                      ).toLocaleString()}
                                    </p>
                                    {order.discount_amount > 0 && (
                                      <p>
                                        <span className="font-medium text-green-600">
                                          割引:
                                        </span>{" "}
                                        -¥
                                        {order.discount_amount.toLocaleString()}
                                      </p>
                                    )}
                                    <p className="font-bold border-t pt-1">
                                      <span className="font-medium">合計:</span>{" "}
                                      ¥{order.total_amount.toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-lg border">
                                  <h5 className="font-medium text-gray-700 mb-2">
                                    廃棄分別情報
                                  </h5>
                                  <div className="space-y-1 text-sm">
                                    {getWasteCategories(
                                      order.details || []
                                    ).map((category, index) => (
                                      <span
                                        key={index}
                                        className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs mr-1 mb-1"
                                      >
                                        {category}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* 注文商品一覧 */}
                              <div className="bg-white rounded-lg border">
                                <div className="px-4 py-3 border-b">
                                  <h5 className="font-medium text-gray-900">
                                    注文商品
                                  </h5>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                          商品名
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                          単価
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                          数量
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                          サイズ
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                          提供方法
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                          小計
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {order.details &&
                                      order.details.length > 0 ? (
                                        order.details.map((detail, index) => (
                                          <tr key={index}>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                              {detail.name}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500">
                                              ¥{detail.price.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500">
                                              {detail.quantity}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500">
                                              <span
                                                className={`px-2 py-1 rounded text-xs ${
                                                  detail.size === "large"
                                                    ? "bg-orange-100 text-orange-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.size === "large"
                                                  ? "大盛り"
                                                  : "普通"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500">
                                              <span
                                                className={`px-2 py-1 rounded text-xs ${
                                                  detail.is_takeout
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-green-100 text-green-800"
                                                }`}
                                              >
                                                {detail.is_takeout
                                                  ? "テイクアウト"
                                                  : "イートイン"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                                              ¥{detail.amount.toLocaleString()}
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={6}
                                            className="px-4 py-4 text-center text-gray-500"
                                          >
                                            注文詳細がありません
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
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
              {orders.length} 件中 {(currentPage - 1) * ordersPerPage + 1} -{" "}
              {Math.min(currentPage * ordersPerPage, orders.length)} 件を表示
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

      {/* 印刷プレビューモーダルを削除 */}
    </div>
  );
}
