"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";

export default function CartPage() {
  const router = useRouter();
  interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
  }

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 未認証の場合はログインページにリダイレクト
        router.push("/login");
      } else {
        // カート内の商品を取得するロジックを追加
        const { data: items } = await supabase
          .from("cart")
          .select("*")
          .eq("user_id", session.user.id);

        setCartItems(items || []);
        const total = (items || []).reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        setTotalAmount(total);
      }
    };

    checkUser();
  }, [router]);

  return (
    <div>
      <Header>
        <button onClick={() => router.push("/orders")}>注文画面に戻る</button>
      </Header>
      <div>
        <h1>カートのページ</h1>
        <p>商品数: {cartItems.length}</p>
        <p>合計金額: ¥{totalAmount}</p>
        <ul>
          {cartItems.map((item) => (
            <li key={item.id}>
              {item.name} - ¥{item.price} x {item.quantity}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
