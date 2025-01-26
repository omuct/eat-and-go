<<<<<<< HEAD
export default function CartPage() {
  return <div></div>;
}
// ↑消してよい
=======
"use client";
/*
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Order } from "@/app/types/order";

export default function Cart() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*");

      if (error) {
        console.error("注文の取得に失敗しました:", error);
      } else {
        setOrders(data as Order[]);
      }
    };

    fetchOrders();
  }, []);

  const handleConfirmOrder = async () => {
    console.log("注文が完了しました");
    // ここに注文確定のための処理を追加できます
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">カートの中身</h1>
      <ul>
        {orders.map((order) => (
          <li key={order.id} className="mb-2">
            {order.description} - {order.price}円
          </li>
        ))}
      </ul>
      <button
        onClick={handleConfirmOrder}
        className="bg-green-500 text-white p-2 rounded mt-4"
      >
        注文を確定する
      </button>
    </div>
  );
} */
>>>>>>> bf974e00509efbf29bd203fa9afff90599211936
