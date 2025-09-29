"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Users,
  Crown,
  ShoppingBag,
  User,
  RefreshCw,
  Edit,
  Save,
  X,
  ArrowLeft,
  Search,
  Filter,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
  role: "admin" | "store_staff" | "user";
  phone: string | null;
  address: string | null;
  points: number;
}

interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
}

interface StoreStaff {
  id: string;
  user_id: string;
  store_id: number;
}

interface UserStats {
  total: number;
  admins: number;
  store_staff: number;
  users: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeStaff, setStoreStaff] = useState<StoreStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    role: "admin" | "store_staff" | "user";
    store_id: number | null;
    is_admin: boolean;
    points: number;
  }>({ role: "user", store_id: null, is_admin: false, points: 0 });
  const [pointsInput, setPointsInput] = useState<string>("");
  const usersPerPage = 10;
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `id, name, email, created_at, updated_at, is_admin, role, phone, address, points`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ユーザー一覧取得エラー:", error);
        toast.error("ユーザー一覧の取得に失敗しました");
        return;
      }

      const typedUsers: UserProfile[] = (data || []).map((user: any) => ({
        id: String(user.id),
        name: user.name ? String(user.name) : null,
        email: user.email ? String(user.email) : null,
        created_at: String(user.created_at || ""),
        updated_at: String(user.updated_at || ""),
        is_admin: Boolean(user.is_admin),
        role: (user.role as "admin" | "store_staff" | "user") || "user",
        phone: user.phone ? String(user.phone) : null,
        address: user.address ? String(user.address) : null,
        points:
          typeof user.points === "number"
            ? user.points
            : Number(user.points ?? 0),
      }));

      setUsers(typedUsers);
      console.log(`ユーザー一覧取得成功: ${typedUsers.length}件`);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("ユーザー一覧の取得中にエラーが発生しました");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

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
  const fetchStoreStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("store_staff")
        .select("id, user_id, store_id");

      if (error) {
        console.error("店舗スタッフ取得エラー:", error);
        return;
      }

      const typedStoreStaff: StoreStaff[] = (data || []).map((staff: any) => ({
        id: String(staff.id),
        user_id: String(staff.user_id),
        store_id: Number(staff.store_id),
      }));

      setStoreStaff(typedStoreStaff);
      console.log("店舗スタッフ情報取得成功:", typedStoreStaff); // デバッグ用
    } catch (error) {
      console.error("Error fetching store staff:", error);
    }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchStores(), fetchStoreStaff()]);
  }, []);

  useEffect(() => {
    let filtered = users;

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((user) => {
        const userStore = getUserStore(user.id);
        return (
          (user.name?.toLowerCase() || "").includes(lowerTerm) ||
          user.id.toLowerCase().includes(lowerTerm) ||
          (user.role?.toLowerCase() || "").includes(lowerTerm) ||
          (user.phone?.toLowerCase() || "").includes(lowerTerm) ||
          (user.address?.toLowerCase() || "").includes(lowerTerm) ||
          (userStore?.name?.toLowerCase() || "").includes(lowerTerm) || // 店舗名検索を追加
          String(user.points).includes(lowerTerm)
        );
      });
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, roleFilter, searchTerm]);
  const calculateStats = (): UserStats => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      store_staff: users.filter((user) => user.role === "store_staff").length,
      users: users.filter((user) => user.role === "user").length,
    };
  };

  const getRoleText = (role: string) => {
    const roles: Record<string, string> = {
      admin: "管理者",
      store_staff: "店舗スタッフ",
      user: "一般ユーザー",
    };
    return roles[role] || role;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user.id);
    setEditForm({
      role: user.role,
      store_id: storeStaff.find((s) => s.user_id === user.id)?.store_id || null,
      is_admin: user.is_admin,
      points: typeof user.points === "number" ? user.points : 0,
    });
    setPointsInput(typeof user.points === "number" ? String(user.points) : "0");
  };

  const handleSave = async (userId: string) => {
    try {
      console.log("保存開始:", {
        userId,
        editForm,
        stores: stores.length,
        storeStaff: storeStaff.length,
      });

      if (editForm.role === "store_staff" && !editForm.store_id) {
        toast.error("店舗スタッフには店舗の割り当てが必要です");
        return;
      }

      let numericPoints = 0;
      if (pointsInput.trim() !== "") {
        const parsed = Number(pointsInput);
        if (Number.isNaN(parsed) || parsed < 0) {
          toast.error("ポイントは0以上の整数で入力してください");
          return;
        }
        numericPoints = Math.floor(parsed);
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: editForm.role,
          is_admin: editForm.role === "admin" ? true : editForm.is_admin,
          points: numericPoints,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        console.error("プロフィール更新エラー:", profileError);
        throw profileError;
      }

      if (editForm.role === "store_staff" && editForm.store_id) {
        const { error: deleteError } = await supabase
          .from("store_staff")
          .delete()
          .eq("user_id", userId);

        if (deleteError) {
          console.error("既存割り当て削除エラー:", deleteError);
        }

        const { error: staffError } = await supabase
          .from("store_staff")
          .insert({ user_id: userId, store_id: editForm.store_id });

        if (staffError) {
          console.error("新規割り当て追加エラー:", staffError);
          throw staffError;
        }

        console.log("店舗割り当て成功:", {
          userId,
          store_id: editForm.store_id,
        });
      } else {
        await supabase.from("store_staff").delete().eq("user_id", userId);
      }

      const selectedStore = stores.find((s) => s.id === editForm.store_id);
      const storeMessage = selectedStore ? ` (${selectedStore.name})` : "";
      toast.success(
        `ユーザー情報を更新しました${storeMessage}（ポイント: ${numericPoints}pt）`
      );
      setEditingUser(null);
      setPointsInput("");
      await Promise.all([fetchUsers(), fetchStoreStaff()]);
      console.log("データ再取得完了");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("更新に失敗しました");
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setPointsInput("");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([fetchUsers(), fetchStores(), fetchStoreStaff()]);
  };

  const resetFilters = () => {
    setRoleFilter("all");
    setSearchTerm("");
  };

  const getCurrentUsers = () => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  };

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const getUserStore = (userId: string) => {
    const staffInfo = storeStaff.find((s) => s.user_id === userId);
    if (!staffInfo) return null;
    const store = stores.find((s) => s.id === staffInfo.store_id);
    if (!store) return null;

    return {
      id: store.id,
      name: store.name,
      address: store.address,
      phone: store.phone,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ユーザー情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">管理者画面一覧に戻る</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Users className="mr-2" />
                ユーザー管理
              </h1>
              <p className="text-gray-600 mt-1">登録ユーザー一覧・役割管理</p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              更新
            </button>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600">総ユーザー数</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Crown className="w-8 h-8 text-red-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.admins}
                </div>
                <div className="text-sm text-gray-600">管理者</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <ShoppingBag className="w-8 h-8 text-green-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.store_staff}
                </div>
                <div className="text-sm text-gray-600">店舗スタッフ</div>
                <div className="text-xs text-gray-500">
                  {storeStaff.length > 0
                    ? `${storeStaff.length}件の店舗割り当て`
                    : "店舗割り当てなし"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <User className="w-8 h-8 text-gray-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {stats.users}
                </div>
                <div className="text-sm text-gray-600">一般ユーザー</div>
              </div>
            </div>
          </div>
        </div>

        {/* フィルター部分 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                検索
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="名前、ID、役割、店舗名、連絡先で検索"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                役割フィルター
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="admin">管理者</option>
                <option value="store_staff">店舗スタッフ</option>
                <option value="user">一般ユーザー</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                フィルターリセット
              </button>
            </div>
          </div>
        </div>

        {/* ユーザー一覧テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー情報
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    役割
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    所属店舗
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ポイント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    連絡先（メールアドレス）
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentUsers().map((user) => {
                  const userStore = getUserStore(user.id);
                  const isEditing = editingUser === user.id;

                  return (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || "未設定"}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editForm.role}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                role: e.target.value as
                                  | "admin"
                                  | "store_staff"
                                  | "user",
                              })
                            }
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="user">一般ユーザー</option>
                            <option value="store_staff">店舗スタッフ</option>
                            <option value="admin">管理者</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === "admin"
                                ? "bg-red-100 text-red-800"
                                : user.role === "store_staff"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {getRoleText(user.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isEditing && editForm.role === "store_staff" ? (
                          <div className="w-full">
                            {/* デバッグ情報 */}
                            <div className="text-xs text-blue-600 mb-1">
                              利用可能店舗数: {stores.length}
                            </div>

                            <select
                              value={editForm.store_id || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  store_id: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                              className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">店舗を選択してください</option>
                              {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                  {store.name} (ID: {store.id})
                                </option>
                              ))}
                            </select>

                            {/* デバッグ情報：店舗リスト */}
                            {stores.length === 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                店舗が取得できていません
                              </div>
                            )}

                            {editForm.store_id && (
                              <div className="mt-1 text-xs text-gray-500">
                                選択中:{" "}
                                {
                                  stores.find((s) => s.id === editForm.store_id)
                                    ?.name
                                }
                              </div>
                            )}
                          </div>
                        ) : userStore ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {userStore.name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {userStore.address}
                            </div>
                            {/* デバッグ情報 */}
                            <div className="text-xs text-blue-500 mt-1">
                              Debug: Store ID {userStore.id}, Staff:{" "}
                              {
                                storeStaff.find((s) => s.user_id === user.id)
                                  ?.store_id
                              }
                            </div>
                          </div>
                        ) : user.role === "store_staff" ? (
                          <div>
                            <div className="text-red-500 text-sm">
                              店舗が未割り当て
                            </div>
                            {/* デバッグ情報 */}
                            <div className="text-xs text-gray-500 mt-1">
                              Debug: StoreStaff entries for user {user.id}:{" "}
                              {
                                storeStaff.filter((s) => s.user_id === user.id)
                                  .length
                              }
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={pointsInput}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  setPointsInput("");
                                  return;
                                }
                                const digits = val.replace(/[^0-9]/g, "");
                                const normalized = digits.replace(
                                  /^0+(\d)/,
                                  "$1"
                                );
                                setPointsInput(normalized);
                              }}
                              onBlur={() => {
                                if (pointsInput === "") setPointsInput("0");
                              }}
                              className="w-28 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                            />
                            <span className="text-gray-600">pt</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-800">
                            {Number(user.points ?? 0).toLocaleString()} pt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {/* メールアドレス表示 */}
                        {user.email ? (
                          <span className="text-blue-700 font-mono">
                            {user.email}
                          </span>
                        ) : (
                          <span className="text-gray-400">未登録</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSave(user.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                前へ
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{filteredUsers.length}</span>{" "}
                  件中{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * usersPerPage + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * usersPerPage, filteredUsers.length)}
                  </span>{" "}
                  件を表示
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    前へ
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 2
                    )
                    .map((page, index, array) => (
                      <div key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    次へ
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          最終更新: {new Date().toLocaleString("ja-JP")}
        </div>
      </div>
    </div>
  );
}
