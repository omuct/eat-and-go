// src/app/admin/business-time/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Calendar, Clock, Plus, X } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isToday,
  isWeekend,
} from "date-fns";
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
        throw new Error("休日データの取得に失敗しました");
      }

      const data = await response.json();

      const monthHolidays = data
        .filter((holiday: any) => {
          const holidayDate = new Date(holiday.date);
          return (
            holidayDate.getFullYear() === currentDate.getFullYear() &&
            holidayDate.getMonth() === currentDate.getMonth()
          );
        })
        .map((holiday: any) => ({
          date: holiday.date,
        }));

      setHolidays(monthHolidays);
    } catch (error) {
      console.error("休日データの取得中にエラーが発生しました:", error);
      setHolidays([]);
    }
  };

  // renderCalendar関数内
  {
    holidays && <div className="text-xs text-red-500">祝日</div>;
  }

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
    console.log("newClosureDate:", newClosureDate);
    console.log("selectedDate:", selectedDate);

    if (!newClosureDate) {
      alert("日付が選択されていません");
      return;
    }
    try {
      const dateStr = format(newClosureDate, "yyyy-MM-dd");
      const existingClosure = closures.find((c) => c.date === dateStr);

      if (existingClosure) {
        // 既存のレコードを上書き更新
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
        // 新しいレコードを作成
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
    } catch (error) {
      console.error("Error adding closure:", error);
      alert("営業時間の追加に失敗しました");
    }
  };

  // 新しい状態変数を追加
  const [newOpenTime, setNewOpenTime] = useState("");
  const [newCloseTime, setNewCloseTime] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const handleDeleteClosure = async (id: string) => {
    if (!confirm("この休業日を削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("business_closures")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchClosures(); // 休業日リストを再取得
    } catch (error) {
      console.error("Error deleting closure:", error);
      alert("休業日の削除に失敗しました");
    }
  };

  const renderCalendar = () => {
    // 月の最初と最後の日を取得
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    // 月の最初の日の曜日を取得
    const startDayOfWeek = start.getDay();

    // 日付の配列を手動で生成
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const handleDateCellClick = (date: Date) => {
      setSelectedDate(date);
      setNewClosureDate(date);
      setShowAddModal(true);

      // 既存の情報があれば、モーダルに設定
      const closure = closures.find(
        (c) => c.date === format(date, "yyyy-MM-dd")
      );
      if (closure) {
        setIsOpen(closure.is_open !== false);
        setNewOpenTime(closure.open_time || "09:00");
        setNewCloseTime(closure.close_time || "14:00");
        setNewClosureReason(closure.reason || "");
      } else {
        // デフォルト値をリセット
        setIsOpen(true);
        setNewOpenTime("09:00");
        setNewCloseTime("14:00");
        setNewClosureReason("");
      }
    };

    return (
      <div className="grid grid-cols-7 gap-1 text-xs sm:text-base">
        {/* 曜日ヘッダー */}
        {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
          <div key={day} className="p-1 sm:p-2 text-center font-bold">
            {day}
          </div>
        ))}

        {/* 開始日の前の空のセル */}
        {[...Array(startDayOfWeek)].map((_, index) => (
          <div key={`empty-${index}`} className="p-1 sm:p-2 bg-gray-100"></div>
        ))}

        {/* 日付 */}
        {days.map((date: Date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
          const isClosed = closures.some((c) => c.date === dateStr);
          const isHoliday = holidays.some((h) => h.date === dateStr);
          const isWeekendDay = isWeekend(date);
          const closure = closures.find((c) => c.date === dateStr);
          const holiday = holidays.find((h) => h.date === dateStr);

          const isSpecialDay = isWeekendDay || isHoliday;

          // 営業状態を決定
          let operationStatus = "";
          let bgColor = "";

          if (holiday) {
            operationStatus = "祝日";
            bgColor = "bg-red-50";
          } else if (closure) {
            if (closure.is_open === false) {
              // 臨時休業の場合
              operationStatus = closure.reason || "休業";
              bgColor = "bg-blue-100"; // 臨時休業は青
            } else if (closure.open_time && closure.close_time) {
              // 平日かつデフォルト時間と異なる場合のみ緑
              if (
                !(
                  isWeekday &&
                  closure.open_time === "09:00" &&
                  closure.close_time === "14:00"
                )
              ) {
                operationStatus = `営業 ${closure.open_time}-${closure.close_time}`;
                bgColor = "bg-green-50"; // 時短営業は緑
              } else {
                operationStatus = "通常営業 09:00-14:00";
              }
            }
          } else if (isWeekday) {
            operationStatus = "通常営業 09:00-14:00";
          } else {
            operationStatus = "休日";
            bgColor = "bg-red-50";
          }

          return (
            <div
              key={dateStr}
              onClick={() => handleDateCellClick(date)}
              className={`
            p-1 sm:p-2 min-h-[50px] sm:min-h-[100px] border cursor-pointer hover:bg-gray-100
            ${isToday(date) ? "border-blue-500" : ""}
            ${bgColor}
          `}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`
                  ${isSpecialDay ? "text-red-500" : ""}
                `}
                >
                  {format(date, "d")}
                </span>
                {/* 通常の休業日の場合のみバツ印を表示 */}
                {closure && closure.is_open === false && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // セルクリックイベントを防止
                      handleDeleteClosure(closure.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {/* 理由を追加 */}
                {closure && closure.is_open === false && closure.reason && (
                  <div className="text-red-600">{closure.reason}</div>
                )}
                {operationStatus}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-medium">管理者画面一覧に戻る</span>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center mb-4 sm:mb-0">
              <Calendar className="mr-2" />
              営業カレンダー
            </h1>
            <div className="flex flex-wrap justify-center items-center space-x-0 sm:space-x-4 space-y-2 sm:space-y-0">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="px-4 py-2 border rounded hover:bg-gray-50 mr-2 sm:mr-0"
              >
                前月
              </button>
              <span className="text-lg font-bold mx-4">
                {format(currentDate, "yyyy年M月")}
              </span>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="px-4 py-2 border rounded hover:bg-gray-50 mr-2 sm:mr-0"
              >
                翌月
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                <Plus size={20} className="mr-2" />
                休業日を追加
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <Clock size={20} className="hidden sm:block" />
              <span>営業時間: 9:00 - 14:00（平日のみ）</span>
            </div>
            <div className="overflow-x-auto">{renderCalendar()}</div>
          </div>
        </div>
      </main>

      {/* モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">
              {format(newClosureDate || selectedDate || new Date(), "M月d日")}
              の営業設定
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={format(
                    newClosureDate || selectedDate || new Date(),
                    "yyyy-MM-dd"
                  )}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) =>
                    setNewClosureDate(
                      e.target.value ? new Date(e.target.value) : null
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  営業状況
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={isOpen ? "true" : "false"}
                  onChange={(e) => setIsOpen(e.target.value === "true")}
                >
                  <option value="true">営業</option>
                  <option value="false">休業</option>
                </select>
              </div>
              {isOpen && (
                <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-4 sm:space-y-0">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-sm font-medium mb-1">
                      開店時間
                    </label>
                    <input
                      type="time"
                      className="w-full border rounded px-3 py-2"
                      value={newOpenTime}
                      onChange={(e) => setNewOpenTime(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label className="block text-sm font-medium mb-1">
                      閉店時間
                    </label>
                    <input
                      type="time"
                      className="w-full border rounded px-3 py-2"
                      value={newCloseTime}
                      onChange={(e) => setNewCloseTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  理由（任意）
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={newClosureReason}
                  onChange={(e) => setNewClosureReason(e.target.value)}
                  placeholder="例：施設点検"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateClosure}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
