"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TrashDetailPage() {
  const { id } = useParams();
  const [bin, setBin] = useState<any>(null);
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [googlemapurl, setGooglemapurl] = useState<string>("");
  const [type, setType] = useState<string>("pet");
  const [capacity, setCapacity] = useState<number>(30);
  const mapRef = useRef<HTMLDivElement>(null);
  const [bins, setBins] = useState<any[]>([]);

  useEffect(() => {
    const fetchBinAndBins = async () => {
      const { data } = await supabase
        .from("trash_bins")
        .select("id, name, amount, lat, lng, place_id, type, capacity")
        .eq("id", id)
        .single();
      setBin(data);
      setEditLat(data?.lat ?? null);
      setEditLng(data?.lng ?? null);
      setEditAmount(data?.amount ?? null);
      setType(data?.type ?? "pet");
      setCapacity(data?.capacity ?? 30);
      if (data?.place_id) {
        const { data: placeData } = await supabase
          .from("places")
          .select("googlemapurl")
          .eq("id", data.place_id)
          .single();
        setGooglemapurl(placeData?.googlemapurl || "");
        const { data: binsData } = await supabase
          .from("trash_bins")
          .select("id, name, lat, lng, amount, capacity, type")
          .eq("place_id", data.place_id);
        setBins(binsData || []);
      }
    };
    if (id) fetchBinAndBins();
  }, [id]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    const latVal = 35.0 + 0.1 * yRatio;
    const lngVal = 135.0 + 0.1 * xRatio;
    setEditLat(latVal);
    setEditLng(lngVal);
  };

  useEffect(() => {
    const fetchBin = async () => {
      const { data } = await supabase
        .from("trash_bins")
        .select("id, name, amount, lat, lng, place_id, type, capacity")
        .eq("id", id)
        .single();
      setBin(data);
      setEditLat(data?.lat ?? null);
      setEditLng(data?.lng ?? null);
      setEditAmount(data?.amount ?? null);
    };
    if (id) fetchBin();
  }, [id]);

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
        type,
        capacity,
      })
      .eq("id", id);
    setLoading(false);
    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      alert("更新しました");
      const { data } = await supabase
        .from("trash_bins")
        .select("id, name, amount, lat, lng, place_id, type, capacity")
        .eq("id", id)
        .single();
      setBin(data);
      setEditAmount(data?.amount ?? null);
      setType(data?.type ?? "pet");
      setCapacity(data?.capacity ?? 30);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("trash_bins")
        .delete()
        .eq("id", id)
        .select("id");
      setLoading(false);
      if (error) {
        alert("削除に失敗しました: " + error.message);
        return;
      }
      const affected = Array.isArray(data) ? data.length : 0;
      if (affected === 0) {
        // フォールバック: 管理者APIで再試行（サービスロールが設定されていれば成功します）
        try {
          const res = await fetch("/api/admin/trash/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            alert(
              "削除できませんでした。権限（RLS）または環境設定の不足の可能性があります: " +
                (body.error || res.statusText)
            );
            return;
          }
          alert("削除しました");
          window.location.href = "/admin/trash";
          return;
        } catch (e: any) {
          alert(
            "削除できませんでした。権限（RLS）または環境設定の不足の可能性があります: " +
              (e?.message || "unknown error")
          );
          return;
        }
      }
      alert("削除しました");
      window.location.href = "/admin/trash";
    } catch (e: any) {
      setLoading(false);
      alert("削除に失敗しました: " + (e?.message || "unknown error"));
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
      <h1 className="text-2xl font-bold mb-4">ゴミ箱詳細</h1>
      {bin ? (
        <div className="bg-white rounded shadow p-4">
          <div>ゴミ箱名: {bin.name}</div>
          <div className="my-4">
            <label className="block mb-2">
              地図上で位置を変更できます（クリックで座標セット）
            </label>
            <div className="flex justify-center">
              <div className="relative w-full max-w-[360px] aspect-[3/4] overflow-hidden rounded border">
                {googlemapurl ? (
                  <iframe
                    src={googlemapurl}
                    className="absolute inset-0 w-full h-full block m-0 border-0 pointer-events-none"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-200 pointer-events-none" />
                )}
                <div
                  ref={mapRef}
                  onClick={handleMapClick}
                  className="absolute inset-0 cursor-crosshair"
                  style={{ zIndex: 2 }}
                >
                  {bins.map((b) => {
                    const percent =
                      b.capacity && b.capacity > 0
                        ? Math.round((b.amount / b.capacity) * 100)
                        : 0;
                    const isEditing = b.id === bin?.id;
                    const lng = isEditing && editLng !== null ? editLng : b.lng;
                    const lat = isEditing && editLat !== null ? editLat : b.lat;
                    return (
                      <div
                        key={b.id}
                        style={{
                          position: "absolute",
                          left: `${((lng - 135.0) / 0.1) * 100}%`,
                          top: `${((lat - 35.0) / 0.1) * 100}%`,
                          width: 36,
                          textAlign: "center",
                          transform: "translate(-50%, -100%)",
                          pointerEvents: "none",
                          zIndex: isEditing ? 10 : 1,
                        }}
                      >
                        <img
                          src={
                            percent >= 90
                              ? "/gomibako_full.png"
                              : "/gomibako_empty.png"
                          }
                          alt="trash bin"
                          title={b.name}
                          style={{
                            width: isEditing ? 40 : 32,
                            height: isEditing ? 40 : 32,
                            display: "block",
                            margin: "0 auto",
                            border: isEditing ? "3px solid #2563eb" : "none",
                            borderRadius: isEditing ? 8 : 0,
                            boxShadow: isEditing ? "0 0 8px #2563eb55" : "none",
                            background: isEditing ? "#e0e7ff" : "none",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: isEditing ? "#2563eb" : "#1e293b",
                            background: isEditing
                              ? "#dbeafe"
                              : "rgba(255,255,255,0.8)",
                            borderRadius: 4,
                            padding: "0 4px",
                            marginTop: 2,
                            display: "inline-block",
                            fontWeight: isEditing ? "bold" : "normal",
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
              <label>分別種別</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setCapacity(e.target.value === "pet" ? 30 : 50);
                }}
                className="border px-2 py-1 rounded w-full"
                required
              >
                <option value="pet">プラスチック</option>
                <option value="paper">燃えるゴミ</option>
              </select>
            </div>
            <div>
              <label>上限（{type === "pet" ? "個" : "枚"}）</label>
              <input
                type="number"
                value={capacity}
                min={1}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="border px-2 py-1 rounded w-full"
                required
              />
            </div>
            <div>
              <label>現在入っている数（{type === "pet" ? "個" : "枚"}）</label>
              <input
                type="number"
                min={0}
                value={
                  editAmount !== null && editAmount !== undefined
                    ? editAmount
                    : ""
                }
                onChange={(e) => setEditAmount(Number(e.target.value))}
                className="border px-2 py-1 rounded w-full"
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
