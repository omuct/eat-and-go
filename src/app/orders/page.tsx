"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
//import { Order } from "@/app/types/order";

export default function Orders() {
  const router = useRouter();
  //const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 未認証の場合はログインページにリダイレクト
        router.push("/login");
      } /*else {
        fetchOrders();
      }*/
    };

    checkUser();
  }, [router]);

  /*const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*");

    if (error) {
      console.error("注文の取得に失敗しました:", error);
    } else {
      setOrders(data as Order[]);
    }
  };
  */

  return (
    <div>
      <Header />
      <div className="p-8">
        <h1 className="text-2xl mb-4">注文一覧</h1>

        <ul></ul>
      </div>
    </div>
  );
}
