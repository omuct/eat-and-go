"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminMapEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [googlemapurl, setGooglemapurl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlace = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("places")
        .select("name, description, googlemapurl")
        .eq("id", id)
        .single();
      if (!error && data) {
        setName(data.name || "");
        setDescription(data.description || "");
        setGooglemapurl(data.googlemapurl || "");
      }
      setLoading(false);
    };
    if (id) fetchPlace();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("places")
      .update({ name, description, googlemapurl })
      .eq("id", id);
    setLoading(false);
    if (!error) {
      router.push("/admin/map");
    } else {
      alert("更新に失敗しました: " + error.message);
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
      <h1 className="text-2xl font-bold mb-4">場所情報編集</h1>
      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <form
          onSubmit={handleUpdate}
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
              onChange={(e) => setGooglemapurl(e.target.value)}
              className="border px-3 py-2 rounded w-full"
              placeholder="https://www.google.com/maps/embed?..."
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? "更新中..." : "更新"}
            </button>
            <button
              type="button"
              className="bg-red-600 text-white px-4 py-2 rounded"
              disabled={loading}
              onClick={async () => {
                if (confirm("本当に削除しますか？")) {
                  setLoading(true);
                  const { error } = await supabase
                    .from("places")
                    .delete()
                    .eq("id", id);
                  setLoading(false);
                  if (!error) {
                    router.push("/admin/map");
                  } else {
                    alert("削除に失敗しました: " + error.message);
                  }
                }
              }}
            >
              削除
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
