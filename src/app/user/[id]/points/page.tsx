"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { useAuth } from "@/hooks/useAuth";

// ストレージバケット名 (環境変数で上書き可能: NEXT_PUBLIC_REWARD_IMAGE_BUCKET)
// 未設定時は "image_url" を既定とする（要: Supabase Storage で同名バケット作成済み）
const REWARD_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_REWARD_IMAGE_BUCKET || "image_url";

export default function UserPointsPage() {
  const params = useParams();
  const userId = params?.id as string;
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { user, loading: authLoading } = useAuth();

  type Reward = {
    id: string; // UUID (supabase)
    name: string;
    cost: number; // 必要ポイント
    description?: string | null;
    emoji?: string | null; // 互換のため残す（今後非推奨）
    image_url?: string | null; // 新規追加
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    cost: "", // 空文字許容 → 保存時に数値変換
    description: "",
    is_active: true,
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === "admin";
  // バケット存在チェック用ステート
  const [bucketChecked, setBucketChecked] = useState(false);
  const [bucketError, setBucketError] = useState<string | null>(null);
  // Debug UI 削除: 以前の debugOpen / counts / diagnosticError は不要
  const [rewardsFetchError, setRewardsFetchError] = useState<string | null>(
    null
  );

  // 旧画像削除用: public URL からストレージパス抽出
  const extractStoragePath = (url: string) => {
    // 例: https://<project>.supabase.co/storage/v1/object/public/<bucket>/rewards/uuid.png
    const marker = `/${REWARD_IMAGE_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  };

  // 画像をアップロードし、旧画像があれば削除（エラーは握りつぶし）
  const replaceImage = async (newFile: File, oldUrl?: string | null) => {
    const newUrl = await uploadImage(newFile);
    if (oldUrl) {
      const path = extractStoragePath(oldUrl);
      if (path) {
        supabase.storage
          .from(REWARD_IMAGE_BUCKET)
          .remove([path])
          .catch((e) => console.warn("旧画像削除失敗", e));
      }
    }
    return newUrl;
  };

  // バケット存在確認（初回のみ実行、結果をキャッシュ）
  const ensureBucketExists = async () => {
    if (bucketChecked) return !bucketError;
    const { error } = await supabase.storage
      .from(REWARD_IMAGE_BUCKET)
      .list("", { limit: 1 });
    if (error) {
      const msg = error.message.toLowerCase();
      if (/not found|resource|invalid bucket/.test(msg)) {
        setBucketError(
          `ストレージバケット "${REWARD_IMAGE_BUCKET}" が存在しません。Supabase Dashboard > Storage で作成し公開(パブリック)設定、および RLS ポリシーを追加してください。`
        );
      } else if (/unauthorized|permission|denied/.test(msg)) {
        setBucketError(
          "ストレージにアクセスできません。管理者としてログインしているか、Storage のポリシー(管理者のみ書き込みなど)を確認してください。"
        );
      } else {
        setBucketError("バケット確認エラー: " + error.message);
      }
      setBucketChecked(true);
      return false;
    }
    setBucketError(null);
    setBucketChecked(true);
    return true;
  };

  // ポイントとリワード取得（初期）
  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        // プロフィール
        const profilePromise = supabase
          .from("profiles")
          .select("points")
          .eq("id", userId)
          .single();

        // rewards 詳細列指定
        const detailColumns =
          "id, name, cost, description, emoji, image_url, is_active, created_at, updated_at";
        let rewardsQuery = supabase
          .from("rewards")
          .select(detailColumns)
          .order("cost", { ascending: true });
        let { data: rewardsData, error: rewardsErr } = await rewardsQuery;
        if (rewardsErr) {
          // 典型: 不存在列 42703 → フォールバックで * 取得
          console.warn(
            "[points] rewards select error (detail columns)",
            rewardsErr
          );
          if ((rewardsErr as any).code === "42703") {
            const fallback = await supabase
              .from("rewards")
              .select("*")
              .order("cost", { ascending: true });
            if (fallback.error) {
              setRewardsFetchError(
                `${fallback.error.message} (code=${fallback.error.code || "unknown"})`
              );
              rewardsData = [];
            } else {
              setRewardsFetchError(
                `列不一致のためフォールバック: ${rewardsErr.message} -> '*' で取得 (不足列はテーブルに存在しない可能性)`
              );
              rewardsData = fallback.data || [];
            }
          } else {
            setRewardsFetchError(
              `${rewardsErr.message} (code=${(rewardsErr as any).code || "unknown"})`
            );
            rewardsData = [];
          }
        } else {
          setRewardsFetchError(null);
        }
        const { data: profile, error: profileErr } = await profilePromise;
        if (profileErr) console.warn("[points] profile load error", profileErr);
        setTotalPoints(profile?.points ?? 0);
        setRewards(rewardsData || []);
        console.debug("[points] initial rewards loaded:", rewardsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // 初回マウント時にバケット存在チェック（非同期で実施）
  useEffect(() => {
    ensureBucketExists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshRewards = async () => {
    const detailColumns =
      "id, name, cost, description, emoji, image_url, is_active, created_at, updated_at";
    let { data, error } = await supabase
      .from("rewards")
      .select(detailColumns)
      .order("cost", { ascending: true });
    if (error) {
      console.warn("[points] refresh select error", error);
      if ((error as any).code === "42703") {
        const fallback = await supabase
          .from("rewards")
          .select("*")
          .order("cost", { ascending: true });
        if (fallback.error) {
          setRewardsFetchError(
            `${fallback.error.message} (code=${fallback.error.code || "unknown"})`
          );
          data = [];
        } else {
          setRewardsFetchError(
            `列不一致のためフォールバック: ${error.message} -> '*' で取得`
          );
          data = fallback.data || [];
        }
      } else {
        setRewardsFetchError(
          `${error.message} (code=${(error as any).code || "unknown"})`
        );
        data = [];
      }
    } else {
      setRewardsFetchError(null);
    }
    setRewards(data || []);
    console.debug("[points] refreshed rewards:", data);
  };

  const handleEdit = (r: Reward) => {
    setEditingReward(r);
    setFormState({
      name: r.name,
      cost: String(r.cost),
      description: r.description || "",
      is_active: r.is_active ?? true,
      image_url: r.image_url || "",
    });
    setImagePreview(r.image_url || "");
    setImageFile(null);
  };

  const handleDelete = async (r: Reward) => {
    if (!confirm(`${r.name} を削除しますか？`)) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("rewards").delete().eq("id", r.id);
      if (error) {
        alert("削除に失敗しました: " + error.message);
      } else {
        await refreshRewards();
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File) => {
    const ok = await ensureBucketExists();
    if (!ok) {
      throw new Error(bucketError || "画像バケットが利用できません");
    }
    const MAX_FILE_SIZE_MB = 5;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(
        `ファイルサイズが大きすぎます (最大 ${MAX_FILE_SIZE_MB}MB)`
      );
    }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const allowed = ["png", "jpg", "jpeg", "webp", "gif"]; // 必要に応じて拡張
    if (!allowed.includes(ext)) {
      throw new Error(`未対応の拡張子です: .${ext}`);
    }
    const fileName = `rewards/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(REWARD_IMAGE_BUCKET)
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) {
      console.error("[uploadImage] Storage upload error", error);
      const msg = (error as any).message?.toLowerCase?.() || "";
      if (msg.includes("duplicate")) {
        throw new Error("同名ファイルが既に存在します (再試行してください)");
      }
      if (msg.includes("bucket not found")) {
        throw new Error(
          `画像バケット '${REWARD_IMAGE_BUCKET}' が存在しません。Supabase の Storage で同名バケットを作成し、公開設定/ポリシーを確認してください。`
        );
      }
      if (
        msg.includes("payload") ||
        msg.includes("too large") ||
        msg.includes("file size")
      ) {
        throw new Error("ファイルサイズが制限を超えています");
      }
      if (msg.includes("unauthorized") || msg.includes("permission")) {
        throw new Error("権限がありません。管理者として再ログインしてください");
      }
      throw new Error(
        `アップロードエラー: ${(error as any).message || "不明なエラー"}`
      );
    }
    const { data } = supabase.storage
      .from(REWARD_IMAGE_BUCKET)
      .getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_FILE_SIZE_MB = 5;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(
          `ファイルサイズが大きすぎます。最大 ${MAX_FILE_SIZE_MB}MB までです`
        );
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // バリデーション
      if (!formState.name.trim()) {
        alert("名称を入力してください");
        return;
      }
      if (formState.cost === "") {
        alert("必要ポイントを入力してください");
        return;
      }
      const costNum = Number(formState.cost);
      if (isNaN(costNum) || costNum < 0) {
        alert("必要ポイントは0以上の数値で入力してください");
        return;
      }

      let imageUrl = formState.image_url || "";
      if (imageFile) {
        try {
          imageUrl = await replaceImage(
            imageFile,
            editingReward ? editingReward.image_url : undefined
          );
        } catch (imgErr: any) {
          console.error("画像アップロード詳細", imgErr);
          alert(
            `画像アップロードに失敗しました: ${imgErr?.message || "不明なエラー"}`
          );
          return;
        }
      }

      if (editingReward) {
        const { error } = await supabase
          .from("rewards")
          .update({
            name: formState.name,
            cost: costNum,
            description: formState.description || null,
            image_url: imageUrl || null,
            is_active: formState.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingReward.id);
        if (error) {
          alert("更新に失敗しました: " + error.message);
        }
      } else {
        const { error } = await supabase.from("rewards").insert({
          name: formState.name,
          cost: costNum,
          description: formState.description || null,
          image_url: imageUrl || null,
          is_active: formState.is_active,
        });
        if (error) {
          alert("作成に失敗しました: " + error.message);
        }
      }
      await refreshRewards();
      setEditingReward(null);
      setFormState({
        name: "",
        cost: "",
        description: "",
        is_active: true,
        image_url: "",
      });
      setImageFile(null);
      setImagePreview("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <Link
            href="/user"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">マイページに戻る</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-8">ポイント確認</h1>
        <div className="mb-6 bg-white rounded-lg shadow p-6 flex items-center justify-between">
          <span className="text-lg font-semibold">保有ポイント</span>
          <span className="text-3xl font-bold text-yellow-500">
            {totalPoints.toLocaleString()} pt
          </span>
        </div>
        {loading ? (
          <div className="text-center text-gray-500">読み込み中...</div>
        ) : null}

        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">ポイント交換</h2>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setManageMode((v) => !v)}
                  className="px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50"
                >
                  {manageMode ? "閲覧モード" : "管理モード"}
                </button>
                {manageMode && (
                  <button
                    onClick={() => {
                      setEditingReward(null);
                      setFormState({
                        name: "",
                        cost: "",
                        description: "",
                        is_active: true,
                        image_url: "",
                      });
                      setImageFile(null);
                      setImagePreview("");
                    }}
                    className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    新規追加
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 管理フォーム */}
          {manageMode && isAdmin && (
            <form
              onSubmit={handleSave}
              className="bg-white rounded-lg shadow p-5 mb-6 space-y-3"
            >
              <h3 className="font-semibold text-gray-800 mb-2">
                {editingReward ? "リワード編集" : "リワード追加"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    名称
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    必要ポイント
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="例: 10"
                    value={formState.cost}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v)) {
                        setFormState({ ...formState, cost: v });
                      }
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">
                    画像（正方形推奨）
                  </label>
                  <div className="flex flex-col gap-2">
                    {imagePreview ? (
                      <div className="relative w-32 h-32">
                        <img
                          src={imagePreview}
                          alt="preview"
                          className="w-32 h-32 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview("");
                            setFormState({ ...formState, image_url: "" });
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`w-32 h-32 flex items-center justify-center border-2 border-dashed rounded text-xs cursor-pointer transition-colors ${bucketError ? "text-red-500 border-red-400 bg-red-50" : "text-gray-500 bg-gray-50 hover:bg-gray-100"}`}
                      >
                        <span>
                          {bucketError ? "バケット未設定" : "画像を選択"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                          disabled={!!bucketError}
                        />
                      </label>
                    )}
                  </div>
                  {bucketError && (
                    <p className="mt-2 text-xs text-red-600 whitespace-pre-line">
                      {bucketError}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    新しく画像を選択しなければ既存の画像は保持されます
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    有効
                  </label>
                  <select
                    value={formState.is_active ? "true" : "false"}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        is_active: e.target.value === "true",
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="true">有効</option>
                    <option value="false">無効</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">
                    説明
                  </label>
                  <textarea
                    rows={2}
                    value={formState.description}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        description: e.target.value,
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                {editingReward && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReward(null);
                      setFormState({
                        name: "",
                        cost: "",
                        description: "",
                        is_active: true,
                        image_url: "",
                      });
                      setImageFile(null);
                      setImagePreview("");
                    }}
                    className="px-4 py-2 text-sm rounded border bg-white hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 text-sm rounded text-white ${
                    saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {saving ? "保存中..." : editingReward ? "更新" : "追加"}
                </button>
              </div>
            </form>
          )}

          {(() => {
            const visible = rewards.filter((r) =>
              manageMode ? true : r.is_active !== false
            );
            if (!loading && visible.length === 0) {
              return (
                <div className="p-8 bg-white rounded-lg shadow text-center text-sm text-gray-500">
                  {manageMode
                    ? "リワードはまだ登録されていません。『新規追加』から作成してください。"
                    : "現在交換可能なリワードはありません。"}
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visible.map((item) => {
                  const insufficient = totalPoints < item.cost;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg shadow p-5 flex flex-col relative"
                    >
                      {manageMode && isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-xs px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={saving}
                            className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            削除
                          </button>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="text-3xl" aria-hidden>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded border bg-gray-50"
                            />
                          ) : (
                            <span className="w-12 h-12 flex items-center justify-center text-[10px] bg-gray-100 rounded border text-gray-500">
                              画像なし
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                              {item.name}
                            </h3>
                            <span className="text-sm text-gray-600">
                              {item.cost.toLocaleString()} pt
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {item.description}
                            </p>
                          )}
                          {manageMode && item.is_active === false && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-300 text-gray-700">
                              無効
                            </span>
                          )}
                        </div>
                      </div>
                      {!manageMode && (
                        <div className="mt-4 flex justify-end">
                          <button
                            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                              insufficient || isRedeeming
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                            disabled={insufficient || isRedeeming}
                            onClick={() => setConfirmReward(item)}
                          >
                            交換する
                          </button>
                        </div>
                      )}
                      {!manageMode && insufficient && (
                        <p className="text-xs text-red-500 mt-2">
                          ポイントが不足しています
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {confirmReward && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-3">本当に交換しますか？</h3>
              <p className="text-sm text-gray-700 mb-6">
                「{confirmReward.name}」と {confirmReward.cost.toLocaleString()}{" "}
                pt を交換します。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setConfirmReward(null)}
                >
                  いいえ
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    isRedeeming
                      ? "bg-gray-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={async () => {
                    if (!confirmReward) return;
                    try {
                      setIsRedeeming(true);
                      const { data: sessionData } =
                        await supabase.auth.getSession();
                      const session = sessionData?.session;
                      if (!session) {
                        alert("ログインが必要です");
                        setIsRedeeming(false);
                        return;
                      }
                      const { data: profile, error: profileError } =
                        await supabase
                          .from("profiles")
                          .select("points")
                          .eq("id", userId)
                          .single();
                      if (profileError) {
                        alert("ポイントの取得に失敗しました");
                        setIsRedeeming(false);
                        return;
                      }
                      const currentPoints = profile?.points ?? 0;
                      if (currentPoints < confirmReward.cost) {
                        alert("ポイントが不足しています");
                        setIsRedeeming(false);
                        setConfirmReward(null);
                        return;
                      }
                      const newPoints = currentPoints - confirmReward.cost;
                      const { error: updateError } = await supabase
                        .from("profiles")
                        .update({ points: newPoints })
                        .eq("id", userId);
                      if (updateError) {
                        alert("交換処理に失敗しました");
                        setIsRedeeming(false);
                        return;
                      }
                      setTotalPoints(newPoints);
                      alert(
                        "交換が完了しました。引換所で本画面を提示してください。"
                      );
                    } catch (e) {
                      console.error(e);
                      alert("予期せぬエラーが発生しました");
                    } finally {
                      setIsRedeeming(false);
                      setConfirmReward(null);
                    }
                  }}
                  disabled={isRedeeming}
                >
                  はい
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
