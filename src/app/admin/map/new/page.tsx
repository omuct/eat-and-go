"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminMapNewPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [googlemapurl, setGooglemapurl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValidEmbedUrl = (url: string) =>
    /^https:\/\/www\.google\.com\/maps\/embed\?/.test(url.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmbedUrl(googlemapurl)) {
      alert(
        "Googleマップの埋め込み用URL（https://www.google.com/maps/embed?...）を入力してください"
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("places")
      .insert({ name, description, googlemapurl });
    setLoading(false);
    if (!error) {
      router.push("/admin/map");
    } else {
      alert("登録に失敗しました: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-4">
        <Link
          href="/admin/map"
          className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="font-medium">場所管理画面に戻る</span>
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">場所新規登録</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded shadow p-4 max-w-lg mx-auto"
      >
        <div className="mb-4">
          <label className="block mb-1 font-semibold">場所名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-3 py-2 rounded w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">
            Googleマップ埋め込みURL
          </label>
          <p className="text-xs text-red-600 mb-1">
            ※Googleマップの埋め込みコードから <b>src属性のURLのみ</b>{" "}
            を入力してください。iframeタグ全体ではなく、
            <span className="font-mono">
              https://www.google.com/maps/embed?...
            </span>{" "}
            のみを登録してください。
          </p>
          <input
            type="text"
            value={googlemapurl}
            onChange={(e) => {
              const v = e.target.value;
              setGooglemapurl(v);
              if (!v) {
                setUrlError(null);
              } else if (!isValidEmbedUrl(v)) {
                setUrlError(
                  "埋め込み用のURLではありません（https://www.google.com/maps/embed?... を入力してください）"
                );
              } else {
                setUrlError(null);
              }
            }}
            className="border px-3 py-2 rounded w-full"
            placeholder="https://www.google.com/maps/embed?..."
          />
          {urlError && <p className="mt-1 text-xs text-red-600">{urlError}</p>}
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">プレビュー</p>
            {googlemapurl && isValidEmbedUrl(googlemapurl) ? (
              <div className="relative w-full max-w-[360px] aspect-[3/4] overflow-hidden rounded border">
                <iframe
                  src={googlemapurl}
                  className="absolute inset-0 w-full h-full block m-0 border-0 pointer-events-none"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                有効な埋め込みURLを入力するとプレビューが表示されます
              </p>
            )}
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "登録中..." : "登録"}
        </button>
      </form>
    </div>
  );
}
