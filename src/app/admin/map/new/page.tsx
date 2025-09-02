"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminMapNewPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [googlemapurl, setGooglemapurl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            onChange={(e) => setGooglemapurl(e.target.value)}
            className="border px-3 py-2 rounded w-full"
            placeholder="https://www.google.com/maps/embed?..."
          />
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
