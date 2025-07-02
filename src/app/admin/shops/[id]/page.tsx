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
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("Error fetching store:", error);
        setError("店舗情報の取得に失敗しました");
        return;
      }

      if (data) {
        setFormData({
          name: data.store_name,
          address: data.address,
          phone: data.phone,
          opening_hours: data.opening_hours,
          description: data.description || "",
          image_url: data.image_url || "",
        });
        setImagePreview(data.image_url || "");
      }
      setLoading(false);
    };

    fetchStore();
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
    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase
        .from("stores")
        .update({
          store_name: formData.name,
          address: formData.address,
          phone: formData.phone,
          opening_hours: formData.opening_hours,
          description: formData.description,
          image_url: imageUrl,
        })
        .eq("id", params.id);

      if (error) throw error;

      router.push("/admin/shops");
    } catch (error) {
      console.error("Error updating store:", error);
      setError("店舗の更新に失敗しました");
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

              {/* 他のフィールドも同様... */}

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
