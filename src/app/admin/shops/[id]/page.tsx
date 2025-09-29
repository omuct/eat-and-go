"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface StoreFormData {
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
  description: string;
  image_url: string;
}

export default function EditStorePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    address: "",
    phone: "",
    opening_hours: "",
    description: "",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        console.log("店舗取得開始:", params.id);

        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("id", params.id)
          .single();

        console.log("店舗取得結果:", { data, error });

        if (error) {
          console.error("Error fetching store:", error);
          setError(`店舗情報の取得に失敗しました: ${error.message}`);
          return;
        }

        if (!data) {
          setError("店舗が見つかりませんでした");
          return;
        }

        setFormData({
          name: data.name || data.store_name || "",
          address: data.address || "",
          phone: data.phone || "",
          opening_hours: data.opening_hours || "",
          description: data.description || "",
          image_url: data.image_url || "",
        });
        setImagePreview(data.image_url || "");
      } catch (error) {
        console.error("予期しないエラー:", error);
        setError("店舗情報の取得中に予期しないエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchStore();
    }
  }, [params.id]);

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
      .from("store-images")
      .upload(filePath, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("store-images").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        console.log("画像アップロード開始");
        imageUrl = await uploadImage(imageFile);
        console.log("画像アップロード完了:", imageUrl);
      }

      const { data: existingData, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .eq("id", params.id)
        .single();

      if (fetchError) {
        throw new Error(`データ取得エラー: ${fetchError.message}`);
      }

      console.log("既存データの構造:", Object.keys(existingData));

      const oldStoreName = existingData.name || existingData.store_name || "";
      const updateData: any = {};

      if ("address" in existingData) updateData.address = formData.address;
      if ("phone" in existingData) updateData.phone = formData.phone;
      if ("opening_hours" in existingData)
        updateData.opening_hours = formData.opening_hours;
      if ("description" in existingData)
        updateData.description = formData.description;
      if ("image_url" in existingData) updateData.image_url = imageUrl;
      if ("name" in existingData) {
        updateData.name = formData.name;
      } else if ("store_name" in existingData) {
        updateData.store_name = formData.name;
      }

      console.log("更新データ:", updateData);

      const { data, error } = await supabase
        .from("stores")
        .update(updateData)
        .eq("id", params.id)
        .select();
      console.log("Supabase応答:", { data, error });

      if (error) {
        throw new Error(`データベース更新エラー: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("店舗が見つかりませんでした。");
      }

      if (oldStoreName !== formData.name && oldStoreName) {
        console.log("店舗名変更を検出:", {
          oldStoreName,
          newStoreName: formData.name,
        });

        const { data: foodsData, error: foodsError } = await supabase
          .from("foods")
          .update({ store_name: formData.name })
          .eq("store_name", oldStoreName)
          .select();

        if (foodsError) {
          console.error("商品データ更新エラー:", foodsError);
          alert(
            `店舗情報は更新されましたが、一部の商品データの更新に失敗しました: ${foodsError.message}`
          );
        } else {
          console.log("関連商品データも更新完了:", foodsData);
        }
      }

      console.log("更新成功:", data);
      alert("店舗情報を更新しました");
      router.push("/admin/shops");
    } catch (error) {
      console.error("Error updating store:", error);
      const errorMessage =
        (error as { message?: string })?.message || "不明なエラー";
      setError(`店舗の更新に失敗しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href="/admin/shops"
              className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-medium">店舗管理に戻る</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold mb-6">店舗編集</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow p-6"
          >
            {/* フォーム内容は新規追加と同様 */}
            <div className="grid gap-6">
              {/* 店舗名 */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  店舗名 <span className="text-red-500">*</span>
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

              {/* 住所 */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  住所 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              {/* 電話番号 */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              {/* 営業時間 */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  営業時間 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.opening_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, opening_hours: e.target.value })
                  }
                  placeholder="例: 9:00-18:00"
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
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                />
              </div>

              {/* 画像アップロード */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  店舗画像
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

              {/* 送信ボタン */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "更新中..." : "店舗を更新"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
