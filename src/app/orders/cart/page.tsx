"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import Image from "next/image";
import axios from "axios";

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

  const handleCheckout = async () => {
    try {
      const response = await axios.post("/api/paypay", {
        amount: totalAmount,
        items: cartItems,
      });
      const { url } = response.data;
      window.location.href = url; // 支払いページにリダイレクト
    } catch (error) {
      console.error("支払いに失敗しました:", error);
    }
  };

  return (
    <div>
      <Header />
      <div className="p-8">
        <h1 className="text-2xl mb-4">商品カート</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="border p-4 rounded shadow flex items-center"
            >
              <Image
                src={item.image_url}
                alt={item.name}
                width={50}
                height={50}
                className="w-12 h-12 object-cover mr-4"
              />
              <div>
                <p className="font-bold">{item.name}</p>
                <p>
                  ¥{item.price} x {item.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <p className="text-lg font-bold">商品数: {cartItems.length}</p>
          <p className="text-lg font-bold">合計金額: ¥{totalAmount}</p>
          <button
            className="mt-4 bg-green-500 text-white p-2 rounded"
            onClick={handleCheckout}
          >
            注文を確定する
          </button>
        </div>
      </div>
    </div>
  );
}
