// src/app/admin/add-menu/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface MenuFormData {
  name: string;
  price: number;
  description: string;
  image_url: string;
}

export default function AddNewMenu() {
  const router = useRouter();
  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    price: 0,
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
    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase.from("foods").insert([
        {
          name: formData.name,
          price: formData.price,
          description: formData.description,
          image_url: imageUrl,
          is_published: true,
          publish_start_date: null, // 明示的にnullを設定
          publish_end_date: null, // 明示的にnullを設定
        },
      ]);

      if (error) throw error;

      router.push("/admin/add-menu");
      alert("メニューを追加しました");
    } catch (error) {
      console.error("Error adding menu:", error);
      setError("メニューの追加に失敗しました");
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
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
            メニューの新規作成
          </h1>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow p-4 sm:p-6"
          >
            {/* 入力フィールド */}
            <div className="grid gap-4 sm:gap-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  商品名
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

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  価格
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
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  商品画像
                </label>
                <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-4 sm:p-6">
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
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => router.back()}
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
