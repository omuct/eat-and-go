"use client";

import { useEffect, useState } from "react";
import Header from "@/app/_components/Header";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Place {
  id: string;
  name: string;
  description?: string;
  googlemapurl?: string;
}

export default function PlaceMapPage() {
  const params = useParams();
  const id = params?.id;
  const [bins, setBins] = useState<any[]>([]);
  useEffect(() => {
    if (!id) return;
    const fetchBins = async () => {
      const { data } = await supabase
        .from("trash_bins")
        .select("id, name, lat, lng, place_id, amount, capacity, type")
        .eq("place_id", id);
      setBins(data || []);
    };
    fetchBins();
  }, [id]);
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
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-6 overflow-x-auto">
        <div className="mb-4">
          <Link
            href="/orders/map"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">場所一覧に戻る</span>
          </Link>
        </div>
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
                <div className="w-full">
                  <div className="relative w-[900px] mx-auto aspect-[3/4] sm:aspect-[16/9] overflow-visible rounded-md">
                    <iframe
                      src={place.googlemapurl}
                      className="absolute inset-0 w-full h-full block m-0 border-0 pointer-events-none"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    {bins.map((bin) => {
                      const percent =
                        bin.capacity && bin.capacity > 0
                          ? Math.round((bin.amount / bin.capacity) * 100)
                          : 0;
                      const rawLeft = ((bin.lng - 135.0) / 0.1) * 100;
                      const rawTop = ((bin.lat - 35.0) / 0.1) * 100;
                      const left = Math.max(3, Math.min(97, rawLeft));
                      const top = Math.max(6, Math.min(94, rawTop));
                      return (
                        <div
                          key={bin.id}
                          className="text-center"
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            top: `${top}%`,
                            transform: "translate(-50%, -100%)",
                            pointerEvents: "none",
                          }}
                        >
                          <img
                            src={
                              percent >= 90
                                ? "/gomibako_full.png"
                                : "/gomibako_empty.png"
                            }
                            alt="trash bin"
                            title={bin.name}
                            className="block mx-auto w-4 h-auto sm:w-8 sm:h-auto"
                          />
                          <span className="inline-block mt-0.5 text-slate-800 bg-white/80 rounded px-0.5 text-[9px] sm:text-[12px]">
                            {percent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>GoogleマップURLが登録されていません</div>
              )}
            </div>
          </>
        ) : (
          <div>場所が見つかりません</div>
        )}
      </div>
    </>
  );
}
