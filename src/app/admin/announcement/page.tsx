// src/app/admin/announcement/page.tsx
"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Announcement } from "@/app/_types/announcement";
import { ArrowLeft } from "lucide-react";

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "business-hours":
      return "営業日に関するお知らせ";
    case "menu":
      return "メニューに関するお知らせ";
    case "other":
      return "その他";
    default:
      return category;
  }
};

export default function AnnouncementList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("お知らせの取得エラー:", error);
        return;
      }

      setAnnouncements(data || []);
    };

    fetchAnnouncements();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("本当に削除しますか？")) {
      return;
    }

    // 画像の削除
    const { data: announcement } = await supabase
      .from("announcements")
      .select("image_url")
      .eq("id", id)
      .single();

    if (announcement?.image_url) {
      await supabase.storage
        .from("announcements")
        .remove([announcement.image_url]);
    }

    // お知らせの削除
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("削除エラー:", error);
      return;
    }

    // 状態を更新して再レンダリング
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="font-medium">管理者画面一覧に戻る</span>
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          お知らせ一覧
        </h1>
        <Link
          href="/admin/announcement/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          新規作成
        </Link>
      </div>
      <div className="grid gap-6">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {announcement.title}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              カテゴリ: {getCategoryLabel(announcement.category)}
            </p>
            <div className="flex gap-4">
              <Link
                href={`/admin/announcement/${announcement.id}`}
                className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
              >
                編集
              </Link>
              <button
                onClick={() => handleDelete(announcement.id)}
                className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
