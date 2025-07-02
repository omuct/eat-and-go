// src/app/admin/add-menu/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CATEGORIES, FoodCategory } from "@/app/_types/food";
import Link from "next/link";

interface MenuFormData {
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: FoodCategory;
  store_name: string; // 追加
}

export default function AddNewMenu() {
  const router = useRouter();
  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    price: 0,
    description: "",
    image_url: "",
    category: "その他",
    store_name: "", // 追加
  });
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]); // 追加
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // 店舗一覧を取得する関数
  const fetchStores = async () => {
    console.log("店舗データを取得中..."); // デバッグ用

    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error fetching stores:", error);
      setError("店舗情報の取得に失敗しました");
      return;
    }

    console.log("取得した店舗データ:", data); // デバッグ用
    setStores(data || []);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from("food-images")
      .upload(filePath, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("food-images").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(""); // エラーをリセット

    // バリデーション
    if (!formData.name.trim()) {
      setError("商品名を入力してください");
      setIsLoading(false);
      return;
    }

    if (!formData.category) {
      setError("カテゴリーを選択してください");
      setIsLoading(false);
      return;
    }

    if (formData.price <= 0) {
      setError("価格は0円より大きい値を入力してください");
      setIsLoading(false);
      return;
    }

    if (!formData.store_name) {
      setError("店舗名を選択してください");
      setIsLoading(false);
      return;
    }

    if (!imageFile && !formData.image_url) {
      setError("商品画像をアップロードしてください");
      setIsLoading(false);
      return;
    }

    console.log("フォームデータ:", formData);

    console.log("フォームデータ:", formData); // デバッグ用
    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        console.log("画像をアップロード中..."); // デバッグ用
        imageUrl = await uploadImage(imageFile);
        console.log("アップロード完了:", imageUrl); // デバッグ用
      }

      const insertData = {
        name: formData.name,
        price: formData.price,
        description: formData.description || null, // 空文字の場合はnullに
        image_url: imageUrl,
        category: formData.category,
        store_name: formData.store_name || "店舗情報なし", // 空の場合のデフォルト値
        is_published: true,
        publish_start_date: null,
        publish_end_date: null,
      };

      console.log("挿入するデータ:", insertData); // デバッグ用

      const { data, error } = await supabase.from("foods").insert([insertData]);

      if (error) {
        console.error("Supabaseエラー:", error); // デバッグ用
        throw error;
      }

      console.log("保存成功:", data); // デバッグ用
      alert("メニューを追加しました");
      router.push("/admin/add-menu");
    } catch (error) {
      console.error("Error adding menu:", error);
      console.error("Error details:", JSON.stringify(error, null, 2)); // 詳細なエラー情報

      let errorMessage = "メニューの追加に失敗しました";

      if (error && typeof error === "object") {
        if ("message" in error) {
          errorMessage += `: ${error.message}`;
        }
        if ("details" in error) {
          errorMessage += ` (詳細: ${error.details})`;
        }
        if ("hint" in error) {
          errorMessage += ` (ヒント: ${error.hint})`;
        }
        if ("code" in error) {
          errorMessage += ` (コード: ${error.code})`;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // フォームのレイアウトを修正
    <div className="min-h-screen bg-gray-100">
      <main className="p-4 sm:p-8">
        {" "}
        {/* パディングを調整 */}
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href="/admin/add-menu"
              className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-medium">戻る</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
            メニューの新規作成
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="grid gap-6">
              {/* 商品名 */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              {/* カテゴリー */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  カテゴリー <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as FoodCategory,
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">選択してください</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* 価格 */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  価格 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              {/* 説明（任意） */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  説明
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  店舗名 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.store_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      store_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">店舗を選択してください</option>
                  <option value="店舗情報なし">店舗情報なし</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.name}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 画像アップロード */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  商品画像 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-6">
                  <div className="text-center w-full">
                    {imagePreview ? (
                      <div className="mb-4">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-xs mx-auto rounded max-h-48 object-contain"
                        />
                      </div>
                    ) : (
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <div className="mt-4">
                      <label className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block">
                        画像を選択
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                          //required={!imagePreview}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => router.push("/admin/add-menu")}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
