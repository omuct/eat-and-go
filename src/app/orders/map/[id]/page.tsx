"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Place {
  id: string;
  name: string;
  description?: string;
  googlemapurl?: string;
}

export default function PlaceMapPage() {
  const { id } = useParams();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlace = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("places")
        .select("id, name, description, googlemapurl")
        .eq("id", id)
        .single();
      if (!error && data) {
        setPlace(data);
      }
      setLoading(false);
    };
    if (id) fetchPlace();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {loading ? (
        <div>読み込み中...</div>
      ) : place ? (
        <>
          <h1 className="text-2xl font-bold mb-4">{place.name}</h1>
          {place.description && (
            <div className="mb-2 text-gray-600">{place.description}</div>
          )}
          <div className="mb-6">
            {place.googlemapurl ? (
              <iframe
                src={place.googlemapurl}
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div>GoogleマップURLが登録されていません</div>
            )}
          </div>
        </>
      ) : (
        <div>場所が見つかりません</div>
      )}
    </div>
  );
}
