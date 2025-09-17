"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

interface Place {
  id: string;
  name: string;
  description?: string;
  googlemapurl?: string;
}

export default function AdminMapPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("places")
        .select("id, name, description, googlemapurl")
        .order("name");
      if (!error && data) {
        setPlaces(data);
      }
      setLoading(false);
    };
    fetchPlaces();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-4">
        <Link
          href="/admin"
          className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="font-medium">管理者画面一覧に戻る</span>
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">場所管理</h1>
      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => router.push("/admin/map/new")}
      >
        新規登録
      </button>
      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <ul className="bg-white rounded shadow p-4">
          {places.length === 0 && <li>場所が登録されていません</li>}
          {places.map((place) => (
            <li
              key={place.id}
              className="mb-4 flex justify-between items-center hover:bg-blue-50 p-2 rounded"
            >
              <div>
                <div className="font-bold text-lg text-blue-700">
                  {place.name}
                </div>
                {place.description && (
                  <div className="text-gray-600 text-sm">
                    {place.description}
                  </div>
                )}
              </div>
              <button
                className="px-3 py-1 bg-green-600 text-white rounded"
                onClick={() => router.push(`/admin/map/${place.id}`)}
              >
                編集
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
