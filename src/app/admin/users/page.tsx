// src/app/admin/users/page.js
"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RefreshCw, Users, Crown, GraduationCap, BookOpen } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  id: string;
  name: string | null;
  affiliation_type: string | null;
  student_year: number | null;
  student_course: number | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  total: number;
  admins: number;
  students: number;
  teachers: number;
  staff: number;
  others: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [affiliationFilter, setAffiliationFilter] = useState("all");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const usersPerPage = 10;

  const supabase = createClientComponentClient();

  // コース名の定数
  const COURSE_NAMES = [
    "数理科学科",
    "物理学科",
    "化学科",
    "生物学科",
    "地球学科",
    "数学科",
    "物理学科",
    "化学科",
    "生物学科",
    "地球学科",
  ];

  // ユーザー一覧を取得
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          name,
          affiliation_type,
          student_year,
          student_course,
          is_admin,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ユーザー一覧取得エラー:", error);
        toast.error("ユーザー一覧の取得に失敗しました");
        return;
      }

      setUsers(data || []);
      console.log(`ユーザー一覧取得成功: ${data?.length || 0}件`);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("ユーザー一覧の取得中にエラーが発生しました");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // 初回データ取得
  useEffect(() => {
    fetchUsers();
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = users;

    // 所属フィルター
    if (affiliationFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.affiliation_type === affiliationFilter
      );
    }

    // 検索フィルター
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          (user.name?.toLowerCase() || "").includes(lowerTerm) ||
          user.id.toLowerCase().includes(lowerTerm) ||
          (user.affiliation_type?.toLowerCase() || "").includes(lowerTerm)
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // フィルター変更時はページを1に戻す
  }, [users, affiliationFilter, searchTerm]);

  // 統計情報を計算
  const calculateStats = (): UserStats => {
    return {
      total: users.length,
      admins: users.filter((user) => user.is_admin).length,
      students: users.filter((user) => user.affiliation_type === "student")
        .length,
      teachers: users.filter((user) => user.affiliation_type === "teacher")
        .length,
      staff: users.filter((user) => user.affiliation_type === "staff").length,
      others: users.filter((user) => user.affiliation_type === "other").length,
    };
  };

  // 所属タイプを日本語で表示
  const getAffiliationTypeText = (type: string | null) => {
    const types: Record<string, string> = {
      student: "学生",
      teacher: "教員",
      staff: "スタッフ",
      other: "その他",
    };
    return type ? types[type] || type : "未設定";
  };

  // 学年を表示
  const getStudentYearText = (year: number | null) => {
    return year ? `${year}年生` : "-";
  };

  // コース名を表示
  const getCourseText = (courseIndex: number | null) => {
    if (!courseIndex || courseIndex < 1 || courseIndex > COURSE_NAMES.length) {
      return "-";
    }
    return COURSE_NAMES[courseIndex - 1];
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 更新ボタンのハンドラー
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
  };

  // フィルターリセット
  const resetFilters = () => {
    setAffiliationFilter("all");
    setSearchTerm("");
  };

  // 現在のページのユーザーを取得
  const getCurrentUsers = () => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  };

  // ページ数を計算
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Users className="mr-2" />
              ユーザー管理
            </h1>
            <p className="text-gray-600 mt-1">登録ユーザー一覧・統計情報</p>
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

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
              <GraduationCap className="w-8 h-8 text-purple-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.students}
                </div>
                <div className="text-sm text-gray-600">学生</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-green-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.teachers}
                </div>
                <div className="text-sm text-gray-600">教員</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-orange-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.staff}
                </div>
                <div className="text-sm text-gray-600">スタッフ</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-gray-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {stats.others}
                </div>
                <div className="text-sm text-gray-600">その他</div>
              </div>
            </div>
          </div>
        </div>

        {/* フィルター部分 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="名前、ID、所属で検索"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所属フィルター
              </label>
              <select
                value={affiliationFilter}
                onChange={(e) => setAffiliationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="student">学生</option>
                <option value="teacher">教員</option>
                <option value="staff">スタッフ</option>
                <option value="other">その他</option>
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
                    所属・学年
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    コース
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    権限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新日
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentUsers().length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {searchTerm || affiliationFilter !== "all"
                        ? "検索条件に一致するユーザーが見つかりませんでした"
                        : "ユーザーが見つかりませんでした"}
                    </td>
                  </tr>
                ) : (
                  getCurrentUsers().map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || "名前未設定"}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getAffiliationTypeText(user.affiliation_type)}
                        </div>
                        {user.affiliation_type === "student" && (
                          <div className="text-sm text-gray-500">
                            {getStudentYearText(user.student_year)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getCourseText(user.student_course)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_admin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            👑 管理者
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            👤 一般ユーザー
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
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
                    {Math.min(
                      (currentPage - 1) * usersPerPage + 1,
                      filteredUsers.length
                    )}
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

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

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

        {/* フッター情報 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          最終更新: {new Date().toLocaleString("ja-JP")}
        </div>
      </div>
    </div>
  );
}
