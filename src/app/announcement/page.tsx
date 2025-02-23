"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Announcement } from "@/app/_types/announcement";
import Header from "@/app/_components/Header";
import Link from "next/link";
import { getCategoryLabel } from "@/app/_utils/categoryLabel";
import { ArrowLeft } from "lucide-react";

export default function NewsListPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">ホームに戻る</span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">お知らせ一覧</h1>

        {loading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="bg-white rounded-lg shadow p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/announcement/${announcement.id}`}
                      className="text-lg font-semibold hover:text-blue-600 transition-colors"
                    >
                      {announcement.title}
                    </Link>
                    <div className="mt-2">
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {getCategoryLabel(announcement.category)}
                      </span>
                    </div>
                  </div>
                  <time className="text-sm text-gray-500">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
