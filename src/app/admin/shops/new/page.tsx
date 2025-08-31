"use client";

import { useState } from "react";
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

export default function AddNewStore() {
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
    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase.from("stores").insert([
        {
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          opening_hours: formData.opening_hours,
          description: formData.description,
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;

      router.push("/admin/shops");
    } catch (error) {
      console.error("Error adding store:", error);
      setError("店舗の追加に失敗しました");
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
              href="/admin/shops"
              className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-medium">店舗管理に戻る</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold mb-6">新規店舗追加</h1>

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
                  {isLoading ? "保存中..." : "店舗を追加"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
