"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";

interface OrderDetail {
  id: string;
  order_id: string;
  food_id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  is_takeout: boolean;
  amount: number;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  details?: OrderDetail[];
}

export default function UserOrderHistoryPage() {
  const params = useParams();
  const userId = params?.id as string;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, order_number, total_amount, payment_method, status, created_at,
          order_details (id, order_id, food_id, name, price, quantity, size, is_takeout, amount)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("注文履歴取得エラー", error);
        setOrders([]);
      } else {
        const ordersWithDetails = (data || []).map((order: any) => ({
          ...order,
          details: order.order_details || [],
        }));
        setOrders(ordersWithDetails);
      }
      setLoading(false);
    };
    fetchOrders();
  }, [userId]);

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
        <h1 className="text-2xl font-bold mb-8">注文履歴</h1>
        {loading ? (
          <div className="text-center text-gray-500">読み込み中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500">
            注文履歴はありません。
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">
                    注文番号: {order.order_number}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString("ja-JP")}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>
                    合計金額:{" "}
                    <span className="font-bold">
                      ¥{order.total_amount.toLocaleString()}
                    </span>
                  </span>
                  <span>支払い方法: {order.payment_method}</span>
                </div>
                <div className="mb-2">
                  <span className="font-bold">注文商品:</span>
                  <ul className="list-disc ml-6">
                    {order.details && order.details.length > 0 ? (
                      order.details.map((detail) => (
                        <li key={detail.id} className="text-gray-700">
                          {detail.name} × {detail.quantity}
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400">商品情報なし</li>
                    )}
                  </ul>
                </div>
                <div className="flex justify-between items-center">
                  <span>
                    ステータス:{" "}
                    <span className="font-bold text-blue-600">
                      {getStatusLabel(order.status)}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
