// src/app/admin/business-time/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";

interface BusinessClosure {
  id: string;
  date: string;
  reason?: string;
  open_time?: string;
  close_time?: string;
  is_open?: boolean;
}

interface Holiday {
  date: string;
  name: string;
}

export default function BusinessTimePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [closures, setClosures] = useState<BusinessClosure[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newClosureDate, setNewClosureDate] = useState<Date | null>(null);
  const [newClosureReason, setNewClosureReason] = useState("");
  const [newOpenTime, setNewOpenTime] = useState("");
  const [newCloseTime, setNewCloseTime] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchClosures(), fetchHolidays()]);
    };
    fetchData();
  }, [currentDate]);

  const fetchHolidays = async () => {
    try {
      const response = await fetch(
        `https://date.nager.at/api/v3/publicholidays/${currentDate.getFullYear()}/JP`
      );

      if (!response.ok) {
        throw new Error("祝日データの取得に失敗しました");
      }

      const data = await response.json();

      const monthHolidays = data
        .filter((holiday: any) => {
          const holidayDate = new Date(holiday.date);
          return isSameMonth(holidayDate, currentDate);
        })
        .map((holiday: any) => ({
          date: holiday.date,
          name: holiday.name,
        }));

      setHolidays(monthHolidays);
    } catch (error) {
      console.error("休日データの取得中にエラーが発生しました:", error);
      setHolidays([]);
    }
  };

  // 休業日の取得
  const fetchClosures = async () => {
    try {
      const startDate = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentDate), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("business_closures")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;
      setClosures(data || []);
    } catch (error) {
      console.error("Error fetching closures:", error);
    }
  };

  const handleUpdateClosure = async () => {
    if (!newClosureDate) {
      alert("日付が選択されていません");
      return;
    }
    try {
      const dateStr = format(newClosureDate, "yyyy-MM-dd");
      const existingClosure = closures.find((c) => c.date === dateStr);

      if (existingClosure) {
        const { error } = await supabase
          .from("business_closures")
          .update({
            reason: newClosureReason || null,
            open_time: isOpen ? newOpenTime || "09:00" : null,
            close_time: isOpen ? newCloseTime || "14:00" : null,
            is_open: isOpen,
          })
          .eq("id", existingClosure.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_closures").insert({
          date: dateStr,
          reason: newClosureReason || null,
          open_time: isOpen ? newOpenTime || "09:00" : null,
          close_time: isOpen ? newCloseTime || "14:00" : null,
          is_open: isOpen,
        });

        if (error) throw error;
      }

      setShowAddModal(false);
      setSelectedDate(null);
      await fetchClosures();
      toast.success("営業時間を更新しました");
    } catch (error) {
      console.error("Error updating closure:", error);
      alert("営業時間の更新に失敗しました");
    }
  };

  const handleAddClosure = async () => {
    if (!newClosureDate) return;

    try {
      const { error } = await supabase.from("business_closures").insert({
        date: format(newClosureDate, "yyyy-MM-dd"),
        reason: newClosureReason || null,
        open_time: isOpen ? newOpenTime || "09:00" : null,
        close_time: isOpen ? newCloseTime || "14:00" : null,
        is_open: isOpen,
      });

      if (error) throw error;

      setShowAddModal(false);
      setNewClosureDate(null);
      setNewClosureReason("");
      setNewOpenTime("");
      setNewCloseTime("");
      setIsOpen(true);
      await fetchClosures();
      toast.success("営業時間を追加しました");
    } catch (error) {
      console.error("Error adding closure:", error);
      alert("営業時間の追加に失敗しました");
    }
  };

  const handleDeleteClosure = async (id: string) => {
    if (!confirm("この休業日を削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("business_closures")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchClosures();
      toast.success("休業日を削除しました");
    } catch (error) {
      console.error("Error deleting closure:", error);
      alert("休業日の削除に失敗しました");
    }
  };

  const renderCalendar = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startDayOfWeek = start.getDay();

    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const handleDateCellClick = (date: Date) => {
      setSelectedDate(date);
      setNewClosureDate(date);
      setShowAddModal(true);
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, "yyyy年M月")}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div key={index} className="p-2"></div>
          ))}
          {days.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const closure = closures.find((c) => c.date === dateStr);
            const holiday = holidays.find((h) => h.date === dateStr);
            const isToday_ = isToday(date);

            return (
              <div
                key={dateStr}
                onClick={() => handleDateCellClick(date)}
                className={`
                  p-2 text-center text-sm cursor-pointer border rounded
                  ${isToday_ ? "bg-blue-100 border-blue-500" : "border-gray-200"}
                  ${closure ? "bg-red-100" : "hover:bg-gray-50"}
                  ${holiday ? "bg-pink-100" : ""}
                `}
              >
                <div>{format(date, "d")}</div>
                {closure && (
                  <div className="text-xs text-red-600">
                    {closure.is_open ? "時間変更" : "休業"}
                  </div>
                )}
                {holiday && <div className="text-xs text-pink-600">祝日</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="font-medium">管理者画面一覧に戻る</span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">営業カレンダー管理</h1>

        {renderCalendar()}

        {/* 休業日一覧 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            設定済み営業時間変更・休業日
          </h2>
          <div className="space-y-2">
            {closures.map((closure) => (
              <div
                key={closure.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <span className="font-medium">
                    {format(new Date(closure.date), "yyyy年M月d日")}
                  </span>
                  {closure.reason && (
                    <span className="ml-2 text-gray-600">
                      ({closure.reason})
                    </span>
                  )}
                  <div className="text-sm text-gray-500">
                    {closure.is_open
                      ? `営業時間: ${closure.open_time} - ${closure.close_time}`
                      : "休業日"}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClosure(closure.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">営業時間設定</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  日付
                </label>
                <input
                  type="date"
                  value={
                    newClosureDate ? format(newClosureDate, "yyyy-MM-dd") : ""
                  }
                  onChange={(e) => setNewClosureDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    営業する
                  </span>
                </label>
              </div>

              {isOpen && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開店時間
                    </label>
                    <input
                      type="time"
                      value={newOpenTime}
                      onChange={(e) => setNewOpenTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      閉店時間
                    </label>
                    <input
                      type="time"
                      value={newCloseTime}
                      onChange={(e) => setNewCloseTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  理由（任意）
                </label>
                <input
                  type="text"
                  value={newClosureReason}
                  onChange={(e) => setNewClosureReason(e.target.value)}
                  placeholder="例: 定期メンテナンス"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateClosure}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
    </div>
  );
}
