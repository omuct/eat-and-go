"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function TrashDetailPage() {
  const { id } = useParams();
  const [bin, setBin] = useState<any>(null);
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [googlemapurl, setGooglemapurl] = useState<string>("");
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ゴミ箱情報取得
    const fetchBin = async () => {
      const { data } = await supabase
        .from("trash_bins")
        .select("id, name, amount, lat, lng, place_id")
        .eq("id", id)
        .single();
      setBin(data);
      setEditLat(data?.lat ?? null);
      setEditLng(data?.lng ?? null);
      setEditAmount(data?.amount ?? null);
      // 地図URL取得
      if (data?.place_id) {
        const { data: placeData } = await supabase
          .from("places")
          .select("googlemapurl")
          .eq("id", data.place_id)
          .single();
        setGooglemapurl(placeData?.googlemapurl || "");
      }
    };
    if (id) fetchBin();
  }, [id]);

  // 地図クリックで座標変更
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    // 仮: 地図範囲をlat/lngで決め打ち（例: 35.0〜35.1, 135.0〜135.1）
    const latVal = 35.0 + 0.1 * yRatio;
    const lngVal = 135.0 + 0.1 * xRatio;
    setEditLat(latVal);
    setEditLng(lngVal);
  };

  useEffect(() => {
    const fetchBin = async () => {
      const { data } = await supabase
        .from("trash_bins")
        .select("id, name, amount, lat, lng, place_id")
        .eq("id", id)
        .single();
      setBin(data);
      setEditLat(data?.lat ?? null);
      setEditLng(data?.lng ?? null);
      setEditAmount(data?.amount ?? null);
    };
    if (id) fetchBin();
  }, [id]);

  // 位置・内容量%変更
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("trash_bins")
      .update({
        lat: editLat,
        lng: editLng,
        amount:
          editAmount !== null && editAmount !== undefined
            ? parseInt(editAmount as any, 10)
            : 0,
      })
      .eq("id", id);
    setLoading(false);
    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      alert("更新しました");
      // 再取得
      const { data } = await supabase
        .from("trash_bins")
        .select("id, name, amount, lat, lng, place_id")
        .eq("id", id)
        .single();
      setBin(data);
      setEditAmount(data?.amount ?? null);
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!window.confirm("本当に削除しますか？")) return;
    setLoading(true);
    const { error } = await supabase.from("trash_bins").delete().eq("id", id);
    setLoading(false);
    if (error) {
      alert("削除に失敗しました: " + error.message);
    } else {
      alert("削除しました");
      window.location.href = "/admin/trash";
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">ゴミ箱詳細</h1>
      {bin ? (
        <div className="bg-white rounded shadow p-4">
          <div>ゴミ箱名: {bin.name}</div>
          {/* 地図表示・クリックで座標変更 */}
          <div className="my-4">
            <label className="block mb-2">
              地図上で位置を変更できます（クリックで座標セット）
            </label>
            <div className="flex justify-center">
              <div
                style={{ maxWidth: 900, width: "100%", position: "relative" }}
              >
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
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    地図をクリックして座標を選択
                  </span>
                  {editLat && editLng && (
                    <img
                      src="/gomibako_empty.png"
                      alt="trash bin"
                      style={{
                        position: "absolute",
                        left: `${((editLng - 135.0) / 0.1) * 100}%`,
                        top: `${((editLat - 35.0) / 0.1) * 100}%`,
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
            {editLat && editLng && (
              <div className="text-sm text-green-700 mt-2">
                選択座標: {editLat.toFixed(5)}, {editLng.toFixed(5)}
              </div>
            )}
          </div>
          <form onSubmit={handleUpdate} className="mt-4 space-y-2">
            <div>
              <label>ごみ量(%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={
                  editAmount !== null && editAmount !== undefined
                    ? editAmount
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setEditAmount(val === "" ? null : Number(val));
                }}
                className="border px-2 py-1 rounded w-24 ml-2"
                required
              />
            </div>
            <div>
              <label>緯度(lat)</label>
              <input
                type="number"
                step="0.00001"
                value={editLat ?? ""}
                onChange={(e) => setEditLat(Number(e.target.value))}
                className="border px-2 py-1 rounded w-32 ml-2"
                required
              />
            </div>
            <div>
              <label>経度(lng)</label>
              <input
                type="number"
                step="0.00001"
                value={editLng ?? ""}
                onChange={(e) => setEditLng(Number(e.target.value))}
                className="border px-2 py-1 rounded w-32 ml-2"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
              disabled={loading}
            >
              更新
            </button>
          </form>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded mt-4"
            disabled={loading}
          >
            削除
          </button>
          <div className="mt-4 text-sm text-gray-600">
            座標: {bin.lat}, {bin.lng}
            <br />
            マップID: {bin.place_id}
          </div>
        </div>
      ) : (
        <div>読み込み中...</div>
      )}
    </div>
  );
}
