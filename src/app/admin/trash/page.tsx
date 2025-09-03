"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Place {
  id: string;
  name: string;
}
interface TrashBin {
  id: string;
  name: string;
  amount: number;
}

export default function TrashPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [binsByPlace, setBinsByPlace] = useState<Record<string, TrashBin[]>>(
    {}
  );
  useEffect(() => {
    const fetchData = async () => {
      const { data: placesData } = await supabase
        .from("places")
        .select("id, name");
      setPlaces(placesData || []);
      const { data: binsData } = await supabase
        .from("trash_bins")
        .select("id, name, amount, place_id");
      const grouped: Record<string, TrashBin[]> = {};
      (binsData || []).forEach((bin) => {
        if (!grouped[bin.place_id]) grouped[bin.place_id] = [];
        grouped[bin.place_id].push(bin);
      });
      setBinsByPlace(grouped);
    };
    fetchData();
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">マップごとのゴミ箱一覧</h1>
      {places.map((place) => (
        <div key={place.id} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">{place.name}</h2>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
              onClick={() =>
                (window.location.href = `/admin/trash/new?placeId=${place.id}`)
              }
            >
              ゴミ箱追加
            </button>
          </div>
          <ul className="bg-white rounded shadow p-4">
            {(binsByPlace[place.id] || []).length === 0 && <li>ゴミ箱なし</li>}
            {(binsByPlace[place.id] || []).map((bin) => (
              <li
                key={bin.id}
                className="mb-2 flex justify-between items-center"
              >
                <span>{bin.name}</span>
                <span className="flex items-center">
                  <button
                    className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs mr-2"
                    onClick={() =>
                      (window.location.href = `/admin/trash/${bin.id}`)
                    }
                  >
                    編集
                  </button>
                  ごみ量: {bin.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
