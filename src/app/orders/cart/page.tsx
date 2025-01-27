"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
//import { Order } from "@/app/types/order";

export default function CartPage() {
  const router = useRouter();

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

  return <div>カートのページ</div>;
}
