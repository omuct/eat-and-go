"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import { Pencil, Save, X, AlertTriangle } from "lucide-react";
import {
  UserProfile,
  AffiliationType,
  COURSE_NAMES,
} from "@/app/_types/courses";

export default function AccountPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: params.id,
    name: null,
    affiliation_type: null,
    student_year: null,
    student_course: null,
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    id: params.id,
    name: null,
    affiliation_type: null,
    student_year: null,
    student_course: null,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // プロフィールデータの取得
  // プロフィールデータの取得
  const fetchProfile = async () => {
    try {
      // セッションの確認
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("セッションの取得に失敗しました");
      }

      if (!session) {
        router.push("/login");
        return;
      }

      if (session.user.id !== params.id) {
        router.push("/");
        return;
      }

      setEmail(session.user.email || "");

      // プロフィールデータの取得
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        // データが存在しない場合は新規作成
        if (profileError.code === "PGRST116") {
          const newProfile = {
            id: session.user.id,
            name: null,
            affiliation_type: null,
            student_year: null,
            student_course: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: insertedProfile, error: insertError } = await supabase
            .from("profiles")
            .insert(newProfile)
            .select()
            .single();

          if (insertError) {
            console.error("Profile creation error:", insertError);
            throw new Error("プロフィールの作成に失敗しました");
          }

          setProfile(insertedProfile);
          setEditedProfile(insertedProfile);
          return;
        }

        console.error("Profile fetch error:", profileError);
        throw new Error("プロフィールの取得に失敗しました");
      }

      if (profileData) {
        setProfile(profileData);
        setEditedProfile(profileData);
      }
    } catch (error: any) {
      console.error("Error in fetchProfile:", error);
      setErrorMessage(error.message || "プロフィールの取得に失敗しました");
    }
  };

  // useEffectの修正
  useEffect(() => {
    fetchProfile();

    // リアルタイム更新の購読
    const channel = supabase
      .channel(`profile:${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          console.log("Profile change received:", payload);
          if (payload.new) {
            setProfile(payload.new as UserProfile);
            if (!isEditing) {
              setEditedProfile(payload.new as UserProfile);
            }
          }
        }
      )
      .subscribe();

    // クリーンアップ関数
    return () => {
      channel.unsubscribe();
    };
  }, [params.id, router, isEditing]);

  // プロフィール保存
  const handleSave = async () => {
    try {
      // データの検証
      if (!editedProfile.name?.trim()) {
        setErrorMessage("名前を入力してください");
        return;
      }

      if (!editedProfile.affiliation_type) {
        setErrorMessage("所属区分を選択してください");
        return;
      }

      // 学生の場合は追加の検証
      if (editedProfile.affiliation_type === "学生") {
        if (!editedProfile.student_year) {
          setErrorMessage("学年を選択してください");
          return;
        }
        if (!editedProfile.student_course) {
          setErrorMessage("コースを選択してください");
          return;
        }
      }

      // プロフィールデータの更新
      const { data, error } = await supabase
        .from("profiles")
        .update({
          name: editedProfile.name.trim(),
          affiliation_type: editedProfile.affiliation_type,
          student_year:
            editedProfile.affiliation_type === "学生"
              ? editedProfile.student_year
              : null,
          student_course:
            editedProfile.affiliation_type === "学生"
              ? editedProfile.student_course
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;

      // 更新成功時の処理
      setProfile(data);
      setEditedProfile(data);
      setIsEditing(false);
      setErrorMessage("");
      alert("プロフィールを更新しました");
    } catch (error: any) {
      console.error("Save error:", error);
      setErrorMessage(error.message || "更新中にエラーが発生しました");
    }
  };

  // 編集開始
  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({ ...profile });
  };

  // 編集キャンセル
  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({ ...profile });
    setErrorMessage("");
  };

  // メールアドレス更新
  const handleUpdateEmail = async () => {
    try {
      if (!newEmail.trim()) {
        setErrorMessage("新しいメールアドレスを入力してください");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;

      alert(
        "確認メールを送信しました。メールの指示に従って更新を完了してください。"
      );
      setIsUpdatingEmail(false);
      setNewEmail("");
      setErrorMessage("");
    } catch (error: any) {
      console.error("Email update error:", error);
      setErrorMessage(
        error.message || "メールアドレスの更新中にエラーが発生しました"
      );
    }
  };

  // パスワード更新
  const handleUpdatePassword = async () => {
    try {
      if (!newPassword.trim()) {
        setErrorMessage("新しいパスワードを入力してください");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });
      if (error) throw error;

      alert("パスワードが更新されました");
      setIsUpdatingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setErrorMessage("");
    } catch (error: any) {
      console.error("Password update error:", error);
      setErrorMessage(
        error.message || "パスワードの更新中にエラーが発生しました"
      );
    }
  };

  // アカウント削除
  const handleDeleteAccount = async () => {
    try {
      const confirmed = window.confirm(
        "本当にアカウントを削除しますか？この操作は取り消せません。"
      );
      if (!confirmed) return;

      const { error } = await supabase.auth.admin.deleteUser(params.id);
      if (error) throw error;

      await supabase.auth.signOut();
      router.push("/login");
    } catch (error: any) {
      console.error("Account deletion error:", error);
      setErrorMessage(
        error.message || "アカウントの削除中にエラーが発生しました"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">アカウント設定</h1>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <Pencil size={20} className="mr-2" />
              編集
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="flex items-center text-gray-600 hover:text-gray-700"
              >
                <X size={20} className="mr-2" />
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="flex items-center text-green-600 hover:text-green-700"
              >
                <Save size={20} className="mr-2" />
                保存
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {errorMessage}
          </div>
        )}

        {/* メールアドレス設定 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">メールアドレス設定</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現在のメールアドレス
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full p-2 border rounded-md bg-gray-50"
            />
          </div>

          {/* 名前 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              名前
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.name || ""}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, name: e.target.value })
                }
                className="w-full p-2 border rounded-md"
              />
            ) : (
              <div className="w-full p-2 border rounded-md bg-gray-50">
                {profile.name || "未設定"}
              </div>
            )}
          </div>

          {/* 所属区分 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              所属区分
            </label>
            {isEditing ? (
              <select
                value={editedProfile.affiliation_type || ""}
                onChange={(e) => {
                  const value = e.target.value as AffiliationType;
                  setEditedProfile({
                    ...editedProfile,
                    affiliation_type: value,
                    student_year:
                      value === "学生" ? editedProfile.student_year : null,
                    student_course:
                      value === "学生" ? editedProfile.student_course : null,
                  });
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">選択してください</option>
                <option value="教職員">教職員</option>
                <option value="学生">学生</option>
                <option value="その他">その他</option>
              </select>
            ) : (
              <div className="w-full p-2 border rounded-md bg-gray-50">
                {profile.affiliation_type || "未設定"}
              </div>
            )}
          </div>

          {/* 学生の場合の追加フィールド */}
          {editedProfile.affiliation_type === "学生" && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学年
                </label>
                {isEditing ? (
                  <select
                    value={editedProfile.student_year || ""}
                    onChange={(e) =>
                      setEditedProfile({
                        ...editedProfile,
                        student_year: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">選択してください</option>
                    {[1, 2, 3, 4, 5].map((year) => (
                      <option key={year} value={year}>
                        {year}年生
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full p-2 border rounded-md bg-gray-50">
                    {profile.student_year
                      ? `${profile.student_year}年生`
                      : "未設定"}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  コース
                </label>
                {isEditing ? (
                  <select
                    value={editedProfile.student_course || ""}
                    onChange={(e) =>
                      setEditedProfile({
                        ...editedProfile,
                        student_course: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">選択してください</option>
                    {COURSE_NAMES.map((course, index) => (
                      <option key={index} value={index + 1}>
                        {course}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full p-2 border rounded-md bg-gray-50">
                    {profile.student_course
                      ? COURSE_NAMES[profile.student_course - 1]
                      : "未設定"}
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => setIsUpdatingEmail(!isUpdatingEmail)}
            className="text-blue-600 hover:text-blue-700"
          >
            メールアドレスを変更する
          </button>

          {isUpdatingEmail && (
            <div className="mt-4">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="新しいメールアドレス"
                className="w-full p-2 border rounded-md mb-2"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsUpdatingEmail(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  更新
                </button>
              </div>
            </div>
          )}
        </div>

        {/* パスワード設定 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">パスワード設定</h2>
          <button
            onClick={() => setIsUpdatingPassword(!isUpdatingPassword)}
            className="text-blue-600 hover:text-blue-700"
          >
            パスワードを変更する
          </button>

          {isUpdatingPassword && (
            <div className="mt-4">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワード"
                className="w-full p-2 border rounded-md mb-2"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワード"
                className="w-full p-2 border rounded-md mb-2"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsUpdatingPassword(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdatePassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  更新
                </button>
              </div>
            </div>
          )}
        </div>

        {/* アカウント削除 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center text-red-600 hover:text-red-700"
          >
            <AlertTriangle size={20} className="mr-2" />
            アカウントを削除する
          </button>

          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-red-50 rounded-md">
              <p className="text-red-700 mb-4">
                アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  削除する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
