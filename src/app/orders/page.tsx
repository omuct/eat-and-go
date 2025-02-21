"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";
import ProductCard from "@/app/_components/ProductCard";
import { Food } from "@/app/_types/food";

export default function OrdersPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserAndFetchFoods = async () => {
      try {
        // セッションチェック
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        // 商品データの取得
        const { data, error } = await supabase
          .from("foods")
          .select("*")
          .eq("is_published", true)
          .or(
            `publish_start_date.is.null,publish_start_date.lt.${new Date().toISOString()}`
          )
          .or(
            `publish_end_date.is.null,publish_end_date.gt.${new Date().toISOString()}`
          )
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setFoods(data || []);
      } catch (error) {
        console.error("Error:", error);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchFoods();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">商品一覧</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : foods.length === 0 ? (
          <div className="text-center py-8 text-gray-500">商品がありません</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {foods.map((food) => (
              <ProductCard key={food.id} food={food} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
