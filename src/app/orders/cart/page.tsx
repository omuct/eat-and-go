"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<
    {
      id: number;
      name: string;
      price: number;
      quantity: number;
      image_url: string;
    }[]
  >([]);
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
      <Header />
      <div className="p-8">
        <h1 className="text-2xl mb-4">カートのページ</h1>
      </div>
      <div>
        <div>
          {cartItems.map((item) => (
            <div key={item.id}>
              <img
                src={item.image_url}
                alt={item.name}
                width={50}
                height={50}
              />
              <p>{item.name}</p>
            </div>
          ))}
        </div>
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
