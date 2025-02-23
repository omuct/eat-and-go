// src/app/admin/announcement/[id]/page.tsx
"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Announcement } from "@/app/_types/announcement";
import { uploadImage } from "@/app/_utils/fileUproad";

const Editor = dynamic(() => import("@/app/_components/Editor"), {
  ssr: false,
});

export default function EditAnnouncement({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Announcement["category"]>("other");
  const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("お知らせ取得エラー:", error);
        return;
      }

      setAnnouncement(data);
      setTitle(data.title);
      setContent(data.content);
      setCategory(data.category);
    };

    fetchAnnouncement();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let image_url = announcement?.image_url;
      if (image) {
        image_url = await uploadImage(supabase, image);
      }

      const { error } = await supabase
        .from("announcements")
        .update({
          title,
          content,
          category,
          image_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (error) throw error;

      router.push("/admin/announcement");
    } catch (error) {
      console.error("お知らせ更新エラー:", error);
      // TODO: ユーザーへのエラー表示
    }
  };

  if (!announcement) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
        お知らせ編集
      </h1>
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Announcement["category"])
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm transition-colors"
            >
              <option value="business-hours">営業日に関するお知らせ</option>
              <option value="menu">メニューに関するお知らせ</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              本文
            </label>
            <div className="prose max-w-none">
              <Editor value={content} onChange={setContent} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              画像（任意）
            </label>
            {announcement.image_url && (
              <div className="mb-4">
                <img
                  src={announcement.image_url}
                  alt="現在の画像"
                  className="w-48 h-48 object-cover rounded-lg"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 transition-colors"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
