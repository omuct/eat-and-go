"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
import ProductCard from "@/app/_components/ProductCard";
import { Food } from "@/app/types/food";

export default function Orders() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 未認証の場合はログインページにリダイレクト
        router.push("/login");
      } else {
        // fetchFoods(); // データ取得の関数はコメントアウトしておきます
      }
    };

    checkUser();
  }, [router]);

  return (
    <div>
      <Header />
      <div className="p-8">
        <h1 className="text-2xl mb-4">商品一覧</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* サンプルデータを使用してデザインを確認 */}
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
      </div>
    </div>
  );
}
