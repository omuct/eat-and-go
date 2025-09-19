"use client";
"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

export default function TrashNewPage() {
  const searchParams = useSearchParams();
  const placeIdFromQuery = searchParams.get("placeId") || "";
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  // 既存ゴミ箱一覧
  const [bins, setBins] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [placeId, setPlaceId] = useState(placeIdFromQuery);
  const [placeName, setPlaceName] = useState("");
  const [googlemapurl, setGooglemapurl] = useState("");
  const [loading, setLoading] = useState(false);
  // 分別種別と上限
  const [type, setType] = useState("pet"); // "pet" or "paper"
  const [capacity, setCapacity] = useState<number>(30); // デフォルト30本

  useEffect(() => {
    // placeIdがセットされたらマップ名と地図URL取得＆既存ゴミ箱取得
    const fetchPlaceAndBins = async () => {
      if (!placeId) return;
      const { data: placeData } = await supabase
        .from("places")
        .select("name, googlemapurl")
        .eq("id", placeId)
        .single();
      setPlaceName(placeData?.name || "");
      setGooglemapurl(placeData?.googlemapurl || "");
      // 既存ゴミ箱一覧取得
      const { data: binsData } = await supabase
        .from("trash_bins")
        .select("id, name, lat, lng, amount, capacity, type")
        .eq("place_id", placeId);
      setBins(binsData || []);
    };
    fetchPlaceAndBins();
  }, [placeId]);

  // 仮の地図エリア（実際はGoogleMap等を使う）
  // 地図クリックで座標取得（仮: クリック位置をdiv内の割合で計算）
  const mapRef = useRef<HTMLDivElement>(null);
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    // 仮: 地図範囲をlat/lngで決め打ち（例: 35.0〜35.1, 135.0〜135.1）
    const latVal = 35.0 + 0.1 * yRatio;
    const lngVal = 135.0 + 0.1 * xRatio;
    setLat(latVal);
    setLng(lngVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // 追加時はamount=0で初期化
    const { error } = await supabase.from("trash_bins").insert({
      name,
      place_id: placeId,
      lat,
      lng,
      type,
      capacity,
      amount: 0,
    });
    setLoading(false);
    if (error) {
      alert("追加に失敗しました: " + error.message);
    } else {
      alert("ゴミ箱を追加しました");
      setName("");
      setLat(null);
      setLng(null);
      setType("pet");
      setCapacity(30);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/admin/trash"
          className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="font-medium">ごみ箱一覧に戻る</span>
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">ゴミ箱新規追加</h1>
      {placeName && (
        <div className="mb-2 text-lg font-semibold text-blue-700">
          {placeName}の地図
        </div>
      )}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-2">
          <label>ゴミ箱名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-2 py-1 rounded w-full"
            required
          />
        </div>
        <div className="mb-2">
          <label>分別種別</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setCapacity(e.target.value === "pet" ? 30 : 50); // 紙は50枚デフォルト
            }}
            className="border px-2 py-1 rounded w-full"
            required
          >
            <option value="pet">ペットボトル</option>
            <option value="paper">紙</option>
          </select>
        </div>
        <div className="mb-2">
          <label>上限（{type === "pet" ? "本" : "枚"}）</label>
          <input
            type="number"
            value={capacity}
            min={1}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="border px-2 py-1 rounded w-full"
            required
          />
        </div>
        {/* マップIDは自動セット＆非表示 */}
        <input type="hidden" value={placeId} readOnly />
        <div className="mb-2">
          <label>地図上で追加したい場所をクリックしてください</label>
          <div className="flex justify-center mb-2">
            <div style={{ maxWidth: 900, width: "100%", position: "relative" }}>
              {googlemapurl ? (
                <iframe
                  src={googlemapurl}
                  width="100%"
                  height="600"
                  style={{
                    border: 0,
                    display: "block",
                    margin: "0 auto",
                    pointerEvents: "none",
                  }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div
                  className="w-full h-[600px] bg-gray-200"
                  style={{ pointerEvents: "none" }}
                />
              )}
              {/* クリック領域を地図上に重ねる */}
              <div
                ref={mapRef}
                onClick={handleMapClick}
                className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                style={{ zIndex: 2 }}
              >
                {/* 既存ゴミ箱を地図上に表示 */}
                {bins.map((bin) => {
                  const percent =
                    bin.capacity && bin.capacity > 0
                      ? Math.round((bin.amount / bin.capacity) * 100)
                      : 0;
                  return (
                    <div
                      key={bin.id}
                      style={{
                        position: "absolute",
                        left: `${((bin.lng - 135.0) / 0.1) * 100}%`,
                        top: `${((bin.lat - 35.0) / 0.1) * 100}%`,
                        width: 32,
                        textAlign: "center",
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
                        style={{
                          width: 32,
                          height: 32,
                          display: "block",
                          margin: "0 auto",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: "#1e293b",
                          background: "rgba(255,255,255,0.8)",
                          borderRadius: 4,
                          padding: "0 4px",
                          marginTop: 2,
                          display: "inline-block",
                        }}
                      >
                        {percent}%
                      </span>
                    </div>
                  );
                })}
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  地図をクリックして座標を選択
                </span>
                {lat && lng && (
                  <img
                    src="/gomibako_empty.png"
                    alt="trash bin"
                    style={{
                      position: "absolute",
                      left: `${((lng - 135.0) / 0.1) * 100}%`,
                      top: `${((lat - 35.0) / 0.1) * 100}%`,
                      width: 32,
                      height: 32,
                      transform: "translate(-50%, -100%)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          {lat && lng && (
            <div className="text-sm text-green-700">
              選択座標: {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading || !lat || !lng}
        >
          追加
        </button>
      </form>
    </div>
  );
}
