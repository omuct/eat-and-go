"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Announcement } from "@/app/_types/announcement";
import Header from "@/app/_components/Header";
import Link from "next/link";
import { getCategoryLabel } from "@/app/_utils/categoryLabel";
import { getStorageImageUrl } from "@/app/_utils/imageUrl";
import { ArrowLeft } from "lucide-react";

export default function NewsDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) {
          console.error("Error:", error);
          router.push("/");
          return;
        }
        setAnnouncement(data);
      } catch (error) {
        console.error("Error:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-6">
            <p className="text-gray-600">お知らせが見つかりませんでした</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-medium">ホームに戻る</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">ホームに戻る</span>
          </Link>
        </div>

        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 break-words">
              {announcement.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                {getCategoryLabel(announcement.category)}
              </span>
              <time className="text-sm text-gray-500">
                {new Date(announcement.created_at).toLocaleDateString()}
              </time>
            </div>

            {announcement.image_url && (
              <div className="mb-6">
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={getStorageImageUrl(announcement.image_url) || ""}
                    alt={announcement.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      console.error(
                        "Image load error for:",
                        announcement.image_url
                      );
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
            <div
              className="prose max-w-none sm:prose-lg prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-800"
              dangerouslySetInnerHTML={{ __html: announcement.content }}
            />
          </div>
        </article>
      </main>
    </div>
  );
}
