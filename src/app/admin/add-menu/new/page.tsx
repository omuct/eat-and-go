// src/app/admin/add-menu/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  CATEGORIES,
  WASTE_CATEGORIES,
  FoodCategory,
  WasteCategory,
} from "@/app/_types/food";
import Link from "next/link";
import { toast } from "react-toastify";

interface MenuFormData {
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: FoodCategory;
  waste_category: WasteCategory; // 新しい分別項目
  store_name: string;
}

export default function AddNewMenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("storeId");

  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    price: 0,
    description: "",
    image_url: "",
    category: "その他",
    waste_category: "燃えるゴミ", // デフォルト値
    store_name: "",
  });
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // 店舗一覧を取得する関数
  const fetchStores = async () => {
    console.log("店舗データを取得中...");

    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error fetching stores:", error);
      setError("店舗情報の取得に失敗しました");
      return;
    }

    console.log("取得した店舗データ:", data);
    setStores(data || []);
  };

  useEffect(() => {
    fetchStores();

    // storeIdが指定されている場合は店舗を事前選択
    if (storeId) {
      const fetchStoreAndSetDefault = async () => {
        const { data, error } = await supabase
          .from("stores")
          .select("id, name")
          .eq("id", storeId)
          .single();

        if (!error && data) {
          setFormData((prev) => ({ ...prev, store_name: data.name }));
        }
      };

      fetchStoreAndSetDefault();
    }
  }, [storeId]);

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
    setError("");

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

    if (!formData.waste_category) {
      setError("分別カテゴリーを選択してください");
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

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        console.log("画像をアップロード中...");
        imageUrl = await uploadImage(imageFile);
        console.log("アップロード完了:", imageUrl);
      }

      const insertData = {
        name: formData.name,
        price: formData.price,
        description: formData.description || null,
        image_url: imageUrl,
        category: formData.category,
        waste_category: formData.waste_category, // 新しい分別項目
        store_name: formData.store_name || "店舗情報なし",
        is_published: true,
        publish_start_date: null,
        publish_end_date: null,
      };

      console.log("挿入するデータ:", insertData);

      const { data, error } = await supabase.from("foods").insert([insertData]);

      if (error) {
        console.error("Supabaseエラー:", error);
        throw error;
      }

      console.log("保存成功:", data);
      toast.success("メニューを追加しました");

      // storeIdが指定されている場合は店舗別メニュー管理に戻る
      if (storeId) {
        router.push(`/admin/add-menu/store/${storeId}`);
      } else {
        router.push("/admin/add-menu");
      }
    } catch (error) {
      console.error("Error adding menu:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

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
    <div className="min-h-screen bg-gray-100">
      <main className="p-4 sm:p-8">
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
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 分別カテゴリー（新追加） */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  分別カテゴリー <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.waste_category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      waste_category: e.target.value as WasteCategory,
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  {WASTE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  ※この項目は管理用で、お客様には表示されません
                </p>
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

              {/* 店舗名 */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  店舗名 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.store_name}
                  onChange={(e) =>
                    setFormData({ ...formData, store_name: e.target.value })
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
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="プレビュー"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          クリックして画像をアップロード
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
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
                {isLoading ? "保存中..." : "メニューを追加"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
