"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Edit, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
  description?: string;
  image_url?: string;
  created_at?: string;
}

export default function ShopManagement() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching stores:", error);
      return;
    }

    setStores(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const { error } = await supabase.from("stores").delete().eq("id", id);
      if (error) throw error;
      fetchStores();
    } catch (error) {
      console.error("Error deleting store:", error);
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-4 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-medium">管理者画面一覧に戻る</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">店舗管理</h1>
          <button
            onClick={() => router.push("/admin/shops/new")}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            <PlusCircle className="mr-2" size={20} />
            新規店舗の追加
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              {/* スマートフォン向けカード表示 */}
              <div className="md:hidden">
                {stores.map((store) => (
                  <div key={store.id} className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{store.name}</h3>
                    </div>
                    <div className="mb-2 text-sm text-gray-500">
                      住所: {store.address}
                    </div>
                    <div className="mb-2 text-sm text-gray-500">
                      電話番号: {store.phone}
                    </div>
                    <div className="mb-2 text-sm text-gray-500">
                      営業時間: {store.opening_hours}
                    </div>
                    {store.description && (
                      <div className="mb-2 text-sm text-gray-500">
                        説明: {store.description}
                      </div>
                    )}
                    <div className="flex space-x-2 pt-2 border-t">
                      <button
                        onClick={() => router.push(`/admin/shops/${store.id}`)}
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={18} className="mr-1" />
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(store.id)}
                        className="flex items-center text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} className="mr-1" />
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* PC向けテーブル表示 */}
              <table className="min-w-full hidden md:table">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      店舗名
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      住所
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      電話番号
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      営業時間
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stores.map((store) => (
                    <tr key={store.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {store.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {store.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {store.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {store.opening_hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              router.push(`/admin/shops/${store.id}`)
                            }
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <Edit size={18} className="mr-1" />
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
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
          </div>
        )}
      </main>
    </div>
  );
}
