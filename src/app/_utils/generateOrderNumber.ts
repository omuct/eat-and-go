import { supabase } from "@/lib/supabaseClient";

/**
 * その日限り有効な4桁の注文番号を生成し、
 * statusが"pending"|"cooking"|"ready"の注文と重複しない番号を返す
 */
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const statuses = ["pending", "cooking", "ready"];

  for (let i = 0; i < 200; i++) {
    // リトライ回数を200回に増やす
    const num = Math.floor(1000 + Math.random() * 9000).toString();
    // 今日かつ該当statusのorder_numberを取得
    const { data, error } = await supabase
      .from("orders")
      .select("order_number, status, created_at")
      .gte("created_at", todayISO)
      .in("status", statuses)
      .eq("order_number", num);
    if (error) throw error;
    if (!data || data.length === 0) {
      return num;
    }
    // かぶってたら再生成
  }
  throw new Error(
    "注文番号の生成に失敗しました。しばらくして再度お試しください。"
  );
}
