"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
import ProductCard from "@/app/_components/ProductCard";
import { Food } from "@/app/_types/food";

// revalidateをページコンポーネントの外で直接使用するのは避ける
// export const revalidate = 0;

export default function OrdersPage() {
  // 名前を明確にする
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
        }
      } catch (error) {
        console.error("認証エラー:", error);
        router.push("/login");
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">商品一覧</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8)
            .fill(0)
            .map((_, index) => (
              <ProductCard
                key={index}
                food={{
                  id: index,
                  name: `商品名 ${index + 1}`,
                  description: `商品の説明 ${index + 1}`,
                  price: (index + 1) * 1000,
                  imageUrl: `/image/product${index + 1}.jpg`,
                }}
              />
            ))}
        </div>
      </main>
    </div>
  );
}
