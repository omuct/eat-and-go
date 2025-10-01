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

interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
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
  const [stores, setStores] = useState<Store[]>([]);
  const [userStore, setUserStore] = useState<Store | null>(null);
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const isSocialAccount = provider === "google" || provider === "twitter";
  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, address, phone")
        .order("name");

      if (error) {
        console.error("店舗一覧取得エラー:", error);
        return;
      }

      const typedStores: Store[] = (data || []).map((store: any) => ({
        id: Number(store.id),
        name: String(store.name || ""),
        address: String(store.address || ""),
        phone: String(store.phone || ""),
      }));

      setStores(typedStores);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchUserStore = async (userId: string) => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("store_staff")
        .select("store_id")
        .eq("user_id", userId)
        .single();

      if (staffError) {
        if (staffError.code !== "PGRST116") {
          console.error("店舗スタッフ情報取得エラー:", staffError);
        }
        setUserStore(null);
        return;
      }

      if (!staffData) {
        setUserStore(null);
        return;
      }

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id, name, address, phone")
        .eq("id", staffData.store_id)
        .single();

      if (storeError) {
        console.error("店舗情報取得エラー:", storeError);
        setUserStore(null);
        return;
      }

      if (storeData) {
        const store: Store = {
          id: Number(storeData.id),
          name: String(storeData.name),
          address: String(storeData.address),
          phone: String(storeData.phone),
        };
        setUserStore(store);
      }
    } catch (error) {
      console.error("Error fetching user store:", error);
      setUserStore(null);
    }
  };

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

      const appMetadata = session.user.app_metadata;
      setProvider(appMetadata.provider ?? null);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, role, phone, address")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          const newProfile = {
            id: session.user.id,
            name: null,
            role: "user" as const,
            phone: null,
            address: null,
            email: session.user.email || null,
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
    fetchStores();
  }, [params.id, router]);

  useEffect(() => {
    if (profile.role === "store_staff") {
      fetchUserStore(params.id);
    }
  }, [profile.role, params.id]);

  const handleSave = async () => {
    try {
      if (!editedProfile.name?.trim()) {
        toast.error("名前を入力してください");
        return;
      }

      const { data: updatedProfile, error: profileError } = await supabase
        .from("profiles")
        .update({
          name: editedProfile.name.trim(),
          phone: editedProfile.phone?.trim() || null,
          address: editedProfile.address?.trim() || null,
        })
        .eq("id", params.id)
        .select("id, name, role, phone, address")
        .single();

      if (profileError) throw profileError;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.updateUser({
        email: email,
      });

      if (userError) throw userError;

      await supabase
        .from("profiles")
        .update({ email: email })
        .eq("id", params.id);

      const typedProfile: UserProfile = {
        id: String(updatedProfile.id),
        name: updatedProfile.name ? String(updatedProfile.name) : null,
        role:
          (updatedProfile.role as "admin" | "store_staff" | "user") || "user",
        phone: updatedProfile.phone ? String(updatedProfile.phone) : null,
        address: updatedProfile.address ? String(updatedProfile.address) : null,
      };

      setProfile(typedProfile);
      setEditedProfile(typedProfile);
      setIsEditing(false);
      setErrorMessage("");
      toast.success("プロフィールとメールアドレスを更新しました");
    } catch (error: any) {
      console.error("Save error:", error);
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

  const handleAccountDelete = async () => {
    try {
      if (isSocialAccount) {
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", params.id);

        if (profileError) throw profileError;

        await supabase.auth.signOut();
        toast.success("アカウントを削除しました");
        router.push("/login");
      } else {
        if (!deleteConfirmPassword.trim()) {
          toast.error("パスワードを入力してください");
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: deleteConfirmPassword,
        });

        if (signInError) {
          toast.error("パスワードが正しくありません");
          return;
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", params.id);

        if (profileError) throw profileError;

        await supabase.auth.signOut();
        toast.success("アカウントを削除しました");
        router.push("/login");
      }
    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast.error(error.message || "アカウントの削除に失敗しました");
    }
  };

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
                  {isEditing && !isSocialAccount ? (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                      {email || "未設定"}
                    </p>
                  )}
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

                {/* 所属店舗（店舗スタッフの場合のみ表示） */}
                {profile.role === "store_staff" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg
                        className="w-4 h-4 inline mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      所属店舗
                    </label>
                    <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {userStore ? (
                        <div>
                          <div className="font-medium text-gray-900 flex items-center">
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full mr-2">
                              店舗
                            </span>
                            {userStore.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {userStore.address}
                            </div>
                            {userStore.phone && (
                              <div className="flex items-center mt-1">
                                <Phone className="w-3 h-3 mr-1" />
                                {userStore.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-500 text-sm flex items-center">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                          店舗が割り当てられていません
                          <div className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            管理者にお問い合わせください
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
          {/* アカウント情報 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <User className="w-5 h-5 mr-2" />
              アカウント情報
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">アカウント種別:</span>
                <span className="font-medium">
                  {isSocialAccount ? "ソーシャルログイン" : "通常アカウント"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">権限レベル:</span>
                <span
                  className={`font-medium ${
                    profile.role === "admin"
                      ? "text-red-600"
                      : profile.role === "store_staff"
                        ? "text-green-600"
                        : "text-gray-600"
                  }`}
                >
                  {getRoleText(profile.role)}
                </span>
              </div>

              {profile.role === "store_staff" && (
                <div className="flex justify-between">
                  <span className="text-gray-600">店舗割り当て:</span>
                  <span
                    className={`font-medium ${userStore ? "text-green-600" : "text-red-600"}`}
                  >
                    {userStore ? "済" : "未割り当て"}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">プロバイダー:</span>
                <span className="font-medium capitalize">
                  {provider || "email"}
                </span>
              </div>
            </div>

            {profile.role === "store_staff" && userStore && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  勤務店舗
                </h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-medium text-blue-900">
                    {userStore.name}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {userStore.address}
                  </div>
                </div>
              </div>
            )}
          </div>
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
  );
}
