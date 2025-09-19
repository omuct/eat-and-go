"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

interface Place {
  id: string;
  name: string;
}
interface TrashBin {
  id: string;
  name: string;
  amount: number;
  type?: string;
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
        .select("id, name, amount, place_id, type");
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
      <Link
        href="/admin"
        className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
        <span className="font-medium">管理者画面一覧に戻る</span>
      </Link>
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
            {(binsByPlace[place.id] || []).map((bin, idx, arr) => (
              <li
                key={bin.id}
                className={`mb-2 flex justify-between items-center border-b border-gray-200 ${idx === arr.length - 1 ? "border-b-0" : ""} pb-2`}
              >
                <span>{bin.name}</span>
                <span className="flex flex-col items-start min-w-[140px]">
                  <button
                    className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs mb-1 w-full text-left"
                    onClick={() =>
                      (window.location.href = `/admin/trash/${bin.id}`)
                    }
                  >
                    編集
                  </button>
                  <span className="text-sm">
                    ごみ量: {bin.amount}
                    {bin.type === "pet" && (
                      <span className="ml-1 text-xs text-blue-600">
                        (ペットボトル)
                      </span>
                    )}
                    {bin.type === "paper" && (
                      <span className="ml-1 text-xs text-green-600">(紙)</span>
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
