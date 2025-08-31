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

interface StoreStaff {
  id: string;
  user_id: string;
  store_id: number;
}

interface UserProfile {
  id: string;
  role: "admin" | "store_staff" | "user";
}

export default function ShopManagement() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStoreIds, setUserStoreIds] = useState<number[]>([]);
  // ユーザープロフィールを取得
  const fetchUserProfile = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return null;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("プロフィール取得エラー:", profileError);
        return null;
      }

      const profile: UserProfile = {
        id: String(profileData.id),
        role: profileData.role as "admin" | "store_staff" | "user",
      };

      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  // 店舗スタッフの所属店舗IDを取得
  const fetchUserStores = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("store_staff")
        .select("store_id")
        .eq("user_id", userId);

      if (error) {
        console.error("店舗スタッフ情報取得エラー:", error);
        return [];
      }

      const storeIds = (data || []).map((item: any) => Number(item.store_id));
      setUserStoreIds(storeIds);
      return storeIds;
    } catch (error) {
      console.error("Error fetching user stores:", error);
      return [];
    }
  };

  const fetchStores = async (
    userProfile: UserProfile | null,
    allowedStoreIds: number[] = []
  ) => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stores:", error);
        return;
      }

      let storesData = (data || []).map((store: any) => ({
        id: Number(store.id),
        name: String(store.name || ""),
        address: String(store.address || ""),
        phone: String(store.phone || ""),
        opening_hours: String(store.opening_hours || ""),
        description: store.description ? String(store.description) : undefined,
        image_url: store.image_url ? String(store.image_url) : undefined,
        created_at: store.created_at ? String(store.created_at) : undefined,
      }));

      // 店舗スタッフの場合は所属店舗のみフィルタリング
      if (userProfile?.role === "store_staff" && allowedStoreIds.length > 0) {
        storesData = storesData.filter((store) =>
          allowedStoreIds.includes(store.id)
        );
        console.log(
          `店舗スタッフ用フィルタリング: ${storesData.length}店舗表示`
        );
      }

      setStores(storesData);
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      // 1. ユーザープロフィールを取得
      const profile = await fetchUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      // 2. 店舗スタッフの場合は所属店舗を取得
      let allowedStoreIds: number[] = [];
      if (profile.role === "store_staff") {
        allowedStoreIds = await fetchUserStores(profile.id);

        if (allowedStoreIds.length === 0) {
          console.log("所属店舗が割り当てられていません");
          setLoading(false);
          return;
        }
      }

      // 3. 店舗情報を取得（フィルタリング適用）
      await fetchStores(profile, allowedStoreIds);
    };

    initializeData();
  }, [router]);

  const handleDelete = async (id: number) => {
    // 店舗スタッフの場合、所属店舗以外は削除不可
    if (userProfile?.role === "store_staff" && !userStoreIds.includes(id)) {
      alert("所属していない店舗は削除できません");
      return;
    }

    if (!confirm("本当に削除しますか？")) return;

    try {
      const { error } = await supabase.from("stores").delete().eq("id", id);
      if (error) throw error;
      // 削除後、データを再取得
      const allowedStoreIds =
        userProfile?.role === "store_staff" ? userStoreIds : [];
      await fetchStores(userProfile, allowedStoreIds);
    } catch (error) {
      console.error("Error deleting store:", error);
      alert("削除に失敗しました");
    }
  };

  // 権限チェック
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  // 一般ユーザーのアクセス制限
  if (userProfile.role === "user") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-red-800 mb-2">
              アクセス権限がありません
            </h2>
            <p className="text-red-600 mb-4">
              このページにアクセスする権限がありません。
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              トップページに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
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

        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center justify-center">
            店舗管理
            {userProfile.role === "store_staff" && (
              <span className="ml-3 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                店舗スタッフ
              </span>
            )}
          </h1>
          {userProfile.role === "store_staff" && stores.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              {stores.length}店舗を管理しています
            </p>
          )}
        </div>

        {/* 新規追加ボタン（管理者のみ） */}
        {userProfile.role === "admin" && (
          <button
            onClick={() => router.push("/admin/shops/new")}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            <PlusCircle className="mr-2" size={20} />
            新規店舗の追加
          </button>
        )}
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
                        {/* 削除ボタン（管理者のみ、または店舗スタッフで所属店舗の場合） */}
                        {(userProfile.role === "admin" ||
                          (userProfile.role === "store_staff" &&
                            userStoreIds.includes(store.id))) && (
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="flex items-center text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} className="mr-1" />
                            削除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
