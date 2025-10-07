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

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "pet":
        return {
          label: "プラスチック",
          borderColor: "#2563eb",
          glow: "0 0 6px rgba(37,99,235,0.55)",
          badgeBg: "rgba(219,234,254,0.85)",
          badgeColor: "#1e3a8a",
        };
      case "paper":
        return {
          label: "燃えるゴミ",
          borderColor: "#f97316",
          glow: "0 0 6px rgba(249,115,22,0.55)",
          badgeBg: "rgba(255,237,213,0.85)",
          badgeColor: "#7c2d12",
        };
      default:
        return {
          label: type || "不明",
          borderColor: "#64748b",
          glow: "0 0 6px rgba(100,116,139,0.45)",
          badgeBg: "rgba(241,245,249,0.85)",
          badgeColor: "#334155",
        };
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-6">
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
            {/* 凡例 */}
            <div className="flex flex-wrap gap-4 mb-4 items-center text-sm">
              <div className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{
                    background: "#2563eb",
                    boxShadow: "0 0 4px rgba(37,99,235,0.6)",
                  }}
                />
                <span className="text-gray-700">プラスチック</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{
                    background: "#f97316",
                    boxShadow: "0 0 4px rgba(249,115,22,0.6)",
                  }}
                />
                <span className="text-gray-700">燃えるゴミ</span>
              </div>
              <div className="text-xs text-gray-500">
                満杯90%以上で赤いアイコン表示
              </div>
            </div>
            <div className="mb-6">
              {place.googlemapurl ? (
                <div className="w-full">
                  <div className="relative w-full max-w-[360px] mx-auto aspect-[3/4] overflow-hidden rounded border">
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
                      const meta = getTypeStyle(bin.type);
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
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 10,
                              border: `3px solid ${meta.borderColor}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: meta.badgeBg,
                              boxShadow: meta.glow,
                              margin: "0 auto",
                            }}
                            title={`${bin.name} (${meta.label}) 満杯率: ${percent}%`}
                          >
                            <img
                              src={
                                percent >= 90
                                  ? "/gomibako_full.png"
                                  : "/gomibako_empty.png"
                              }
                              alt={`${meta.label} ごみ箱`}
                              className="w-7 h-auto"
                              style={{
                                filter:
                                  percent >= 90
                                    ? "drop-shadow(0 0 4px rgba(220,38,38,0.7))"
                                    : "none",
                              }}
                            />
                          </div>
                          <div
                            className="mt-0.5 mx-auto px-1 rounded text-[10px] font-medium"
                            style={{
                              background: meta.badgeBg,
                              color: meta.badgeColor,
                              lineHeight: 1.2,
                              maxWidth: 70,
                            }}
                          >
                            {meta.label} {percent}%
                          </div>
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
