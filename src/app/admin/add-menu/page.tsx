// src/app/admin/add-menu/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Food {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  is_published: boolean;
  publish_start_date: string | null;
  publish_end_date: string | null;
}

export default function MenuManagement() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFoods = async () => {
    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching foods:", error);
      return;
    }

    setFoods(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const togglePublish = async (food: Food) => {
    try {
      const { error } = await supabase
        .from("foods")
        .update({ is_published: !food.is_published })
        .eq("id", food.id);

      if (error) throw error;
      fetchFoods();
    } catch (error) {
      console.error("Error toggling publish status:", error);
      alert("状態の更新に失敗しました");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const { error } = await supabase.from("foods").delete().eq("id", id);
      if (error) throw error;
      fetchFoods();
    } catch (error) {
      console.error("Error deleting food:", error);
      alert("削除に失敗しました");
    }
  };

  const updatePublishDates = async (
    id: number,
    startDate: string | null,
    endDate: string | null
  ) => {
    try {
      const { error } = await supabase
        .from("foods")
        .update({
          publish_start_date: startDate,
          publish_end_date: endDate,
        })
        .eq("id", id);

      if (error) throw error;
      fetchFoods();
    } catch (error) {
      console.error("Error updating publish dates:", error);
      alert("公開期間の更新に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">メニュー管理</h1>
          <button
            onClick={() => router.push("/admin/add-menu/new")}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            <PlusCircle className="mr-2" size={20} />
            新規メニュー追加
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left">商品名</th>
                  <th className="px-6 py-3 text-left">価格</th>
                  <th className="px-6 py-3 text-left">状態</th>
                  <th className="px-6 py-3 text-left">公開期間</th>
                  <th className="px-6 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {foods.map((food) => (
                  <tr key={food.id} className="border-b">
                    <td className="px-6 py-4">{food.name}</td>
                    <td className="px-6 py-4">{food.price}円</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublish(food)}
                        className={`flex items-center ${
                          food.is_published ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {food.is_published ? (
                          <Eye size={18} className="mr-1" />
                        ) : (
                          <EyeOff size={18} className="mr-1" />
                        )}
                        {food.is_published ? "公開中" : "非公開"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <input
                          type="datetime-local"
                          value={food.publish_start_date?.slice(0, 16) || ""}
                          onChange={(e) =>
                            updatePublishDates(
                              food.id,
                              e.target.value,
                              food.publish_end_date
                            )
                          }
                          className="border rounded px-2 py-1"
                          placeholder="開始日時"
                        />
                        <input
                          type="datetime-local"
                          value={food.publish_end_date?.slice(0, 16) || ""}
                          onChange={(e) =>
                            updatePublishDates(
                              food.id,
                              food.publish_start_date,
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1"
                          placeholder="終了日時"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            router.push(`/admin/add-menu/${food.id}`)
                          }
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={18} className="mr-1" />
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(food.id)}
                          className="flex items-center text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} className="mr-1" />
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
