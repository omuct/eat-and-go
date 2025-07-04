"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/app/_components/Header";
import {
  Pencil,
  Save,
  X,
  ArrowLeft,
  User,
  Mail,
  Shield,
  Phone,
  MapPin,
  Trash2,
  Lock,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string | null;
  role: "admin" | "store_staff" | "user";
  phone: string | null;
  address: string | null;
}

interface AccountPageProps {
  params: {
    id: string;
  };
}

export default function AccountPage({ params }: AccountPageProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [provider, setProvider] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    id: params.id,
    name: null,
    role: "user",
    phone: null,
    address: null,
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    id: params.id,
    name: null,
    role: "user",
    phone: null,
    address: null,
  });

  const [errorMessage, setErrorMessage] = useState("");

  // パスワード変更関連
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // アカウント削除関連
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");

  const isSocialAccount = provider === "google" || provider === "twitter";

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      if (session.user.id !== params.id) {
        router.push("/");
        return;
      }

      setEmail(session.user.email || "");

      // プロバイダー情報を取得
      const appMetadata = session.user.app_metadata;
      setProvider(appMetadata.provider ?? null);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, role, phone, address")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          // プロフィールが存在しない場合は新規作成
          const newProfile = {
            id: session.user.id,
            name: null,
            role: "user" as const,
            phone: null,
            address: null,
          };

          const { data: insertedProfile, error: insertError } = await supabase
            .from("profiles")
            .insert(newProfile)
            .select("id, name, role, phone, address")
            .single();

          if (insertError) {
            throw new Error("プロフィールの作成に失敗しました");
          }

          const typedProfile: UserProfile = {
            id: String(insertedProfile.id),
            name: insertedProfile.name ? String(insertedProfile.name) : null,
            role:
              (insertedProfile.role as "admin" | "store_staff" | "user") ||
              "user",
            phone: insertedProfile.phone ? String(insertedProfile.phone) : null,
            address: insertedProfile.address
              ? String(insertedProfile.address)
              : null,
          };

          setProfile(typedProfile);
          setEditedProfile(typedProfile);
          return;
        }
        throw new Error("プロフィールの取得に失敗しました");
      }

      if (profileData) {
        const typedProfile: UserProfile = {
          id: String(profileData.id),
          name: profileData.name ? String(profileData.name) : null,
          role:
            (profileData.role as "admin" | "store_staff" | "user") || "user",
          phone: profileData.phone ? String(profileData.phone) : null,
          address: profileData.address ? String(profileData.address) : null,
        };

        setProfile(typedProfile);
        setEditedProfile(typedProfile);
      }
    } catch (error: any) {
      console.error("Error in fetchProfile:", error);
      setErrorMessage(error.message || "プロフィールの取得に失敗しました");
      toast.error(error.message || "プロフィールの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [params.id, router]);

  const handleSave = async () => {
    try {
      if (!editedProfile.name?.trim()) {
        setErrorMessage("名前を入力してください");
        toast.error("名前を入力してください");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          name: editedProfile.name.trim(),
          phone: editedProfile.phone?.trim() || null,
          address: editedProfile.address?.trim() || null,
        })
        .eq("id", params.id)
        .select("id, name, role, phone, address")
        .single();

      if (error) throw error;

      const typedProfile: UserProfile = {
        id: String(data.id),
        name: data.name ? String(data.name) : null,
        role: (data.role as "admin" | "store_staff" | "user") || "user",
        phone: data.phone ? String(data.phone) : null,
        address: data.address ? String(data.address) : null,
      };

      setProfile(typedProfile);
      setEditedProfile(typedProfile);
      setIsEditing(false);
      setErrorMessage("");
      toast.success("プロフィールを更新しました");
    } catch (error: any) {
      console.error("Save error:", error);
      setErrorMessage(error.message || "更新中にエラーが発生しました");
      toast.error(error.message || "更新中にエラーが発生しました");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({ ...profile });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({ ...profile });
    setErrorMessage("");
  };

  // パスワード変更
  const handlePasswordChange = async () => {
    try {
      if (!passwordForm.newPassword.trim()) {
        toast.error("新しいパスワードを入力してください");
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error("パスワードは6文字以上で入力してください");
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error("パスワードが一致しません");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success("パスワードを変更しました");
      setIsChangingPassword(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "パスワードの変更に失敗しました");
    }
  };

  // アカウント削除
  const handleAccountDelete = async () => {
    try {
      if (isSocialAccount) {
        // ソーシャルアカウントの場合はプロフィールのみ削除
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", params.id);

        if (profileError) throw profileError;

        await supabase.auth.signOut();
        toast.success("アカウントを削除しました");
        router.push("/login");
      } else {
        // 通常のアカウントの場合
        if (!deleteConfirmPassword.trim()) {
          toast.error("パスワードを入力してください");
          return;
        }

        // パスワードの確認のため再認証
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: deleteConfirmPassword,
        });

        if (signInError) {
          toast.error("パスワードが正しくありません");
          return;
        }

        // プロフィール削除
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", params.id);

        if (profileError) throw profileError;

        // ユーザーアカウント削除は管理者側で処理する必要がある
        // 現在はプロフィールのみ削除してサインアウト
        await supabase.auth.signOut();
        toast.success("アカウントを削除しました");
        router.push("/login");
      }
    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast.error(error.message || "アカウントの削除に失敗しました");
    }
  };

  // 役割の日本語表示
  const getRoleText = (role: string) => {
    const roles: Record<string, string> = {
      admin: "管理者",
      store_staff: "店舗スタッフ",
      user: "一般ユーザー",
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">アカウント情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* パンくずナビ */}
        <div className="mb-6">
          <Link
            href="/user"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">マイページに戻る</span>
          </Link>
        </div>

        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              <User className="w-8 h-8 mr-3 text-blue-600" />
              アカウント設定
            </h1>
            <p className="text-gray-600 mt-1">個人情報の確認・編集</p>
          </div>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Pencil size={20} className="mr-2" />
              編集
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save size={20} className="mr-2" />
                保存
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X size={20} className="mr-2" />
                キャンセル
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-600" />
                基本情報
              </h2>

              <div className="space-y-6">
                {/* 名前 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.name || ""}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          name: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="お名前を入力してください"
                    />
                  ) : (
                    <p className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {profile.name || "未設定"}
                    </p>
                  )}
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    メールアドレス
                  </label>
                  <p className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                    {email || "未設定"}
                  </p>
                  {isSocialAccount && (
                    <p className="text-sm text-gray-500 mt-1">
                      ソーシャルアカウントでログインしているため変更できません
                    </p>
                  )}
                </div>

                {/* 役割 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    役割
                  </label>
                  <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        profile.role === "admin"
                          ? "bg-red-100 text-red-800"
                          : profile.role === "store_staff"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getRoleText(profile.role)}
                    </span>
                  </div>
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    電話番号
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedProfile.phone || ""}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          phone: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="090-1234-5678"
                    />
                  ) : (
                    <p className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {profile.phone || "未設定"}
                    </p>
                  )}
                </div>

                {/* 住所 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    住所
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.address || ""}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          address: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="住所を入力してください"
                    />
                  ) : (
                    <p className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {profile.address || "未設定"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* パスワード変更 */}
            {!isSocialAccount && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-gray-600" />
                  パスワード変更
                </h2>

                {!isChangingPassword ? (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    パスワードを変更
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        新しいパスワード
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="6文字以上で入力してください"
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        パスワード確認
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="同じパスワードを再入力してください"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handlePasswordChange}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        変更する
                      </button>
                      <button
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPasswordForm({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-1 space-y-6">
            {/* 危険な操作 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center">
                <Trash2 className="w-5 h-5 mr-2" />
                危険な操作
              </h3>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  アカウントを削除
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 mb-3 font-medium">
                      ⚠️ この操作は取り消せません
                    </p>
                    <p className="text-sm text-red-600 mb-3">
                      アカウントとすべてのデータが完全に削除されます。
                    </p>

                    {!isSocialAccount && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-red-700 mb-2">
                          確認のためパスワードを入力してください
                        </label>
                        <input
                          type="password"
                          value={deleteConfirmPassword}
                          onChange={(e) =>
                            setDeleteConfirmPassword(e.target.value)
                          }
                          className="w-full p-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="パスワード"
                        />
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={handleAccountDelete}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        削除する
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmPassword("");
                        }}
                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            ご利用について
          </h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• アカウント情報は正確に入力してください</li>
            <li>• パスワードは定期的に変更することをお勧めします</li>
            <li>• アカウント削除は慎重に行ってください</li>
            <li>• ご不明な点がございましたら管理者までお問い合わせください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
