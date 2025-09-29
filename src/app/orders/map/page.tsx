"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";

interface Place {
  id: string;
  name: string;
  description?: string;
}

export default function OrdersMapListPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("places")
        .select("id, name, description")
        .order("name");
      if (!error && data) {
        setPlaces(data);
      }
      setLoading(false);
    };
    fetchPlaces();
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-2xl font-bold mb-4">場所一覧</h1>
        {loading ? (
          <div>読み込み中...</div>
        ) : (
          <ul className="bg-white rounded shadow p-4">
            {places.length === 0 && <li>場所が登録されていません</li>}
            {places.map((place) => (
              <li
                key={place.id}
                className="mb-4 cursor-pointer hover:bg-blue-50 p-2 rounded"
                onClick={() => router.push(`/orders/map/${place.id}`)}
              >
                <div className="font-bold text-lg text-blue-700">
                  {place.name}
                </div>
                {place.description && (
                  <div className="text-gray-600 text-sm">
                    {place.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
