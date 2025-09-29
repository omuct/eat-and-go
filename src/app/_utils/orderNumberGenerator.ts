import { supabase } from "@/lib/supabaseClient";

// 3桁の英数字組み合わせを生成（大文字・小文字・数字）
const generateSequenceId = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 今日の日付を取得（YYYY-MM-DD形式）
const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0];
};

// 店舗番号を3桁でゼロ埋め
const formatStoreNumber = (storeId: number): string => {
  return storeId.toString().padStart(3, "0");
};

// 同日内で使用済みの注文番号を取得
const getUsedOrderNumbers = async (date: string): Promise<Set<string>> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("order_number")
      .gte("created_at", `${date}T00:00:00.000Z`)
      .lt("created_at", `${date}T23:59:59.999Z`)
      .not("order_number", "is", null);

    if (error) {
      console.error("使用済み注文番号の取得エラー:", error);
      return new Set();
    }

    return new Set(data?.map((item) => item.order_number) || []);
  } catch (error) {
    console.error("使用済み注文番号の取得エラー:", error);
    return new Set();
  }
};

// 注文番号を生成（重複チェック付き）
export const generateOrderNumber = async (storeId: number): Promise<string> => {
  const today = getTodayDate();
  const storeNumber = formatStoreNumber(storeId);
  const usedNumbers = await getUsedOrderNumbers(today);

  let attempts = 0;
  const maxAttempts = 1000; // 最大試行回数

  while (attempts < maxAttempts) {
    const sequenceId = generateSequenceId();
    const orderNumber = `${storeNumber}${sequenceId}`;

    // 重複チェック
    if (!usedNumbers.has(orderNumber)) {
      return orderNumber;
    }

    attempts++;
  }

  console.warn(
    `店舗${storeId}の注文番号が不足しています。完了済み注文の番号を再利用します。`
  );

  const { data: completedOrders, error } = await supabase
    .from("orders")
    .select("order_number")
    .eq("status", "served")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`)
    .not("order_number", "is", null)
    .limit(1);

  if (!error && completedOrders && completedOrders.length > 0) {
    return completedOrders[0].order_number;
  }

  const timestamp = Date.now().toString().slice(-3);
  return `${storeNumber}${timestamp}`;
};

export const saveOrderNumber = async (
  orderId: string,
  orderNumber: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ order_number: orderNumber })
      .eq("id", orderId);

    if (error) {
      console.error("注文番号の保存エラー:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("注文番号の保存エラー:", error);
    return false;
  }
};

export const getOrderNumberById = async (
  orderId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("order_number, store_id")
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("注文番号の取得エラー:", error);
      return null;
    }

    if (!data.order_number && data.store_id) {
      const newOrderNumber = await generateOrderNumber(data.store_id);
      const saved = await saveOrderNumber(orderId, newOrderNumber);
      return saved ? newOrderNumber : null;
    }

    return data.order_number;
  } catch (error) {
    console.error("注文番号の取得エラー:", error);
    return null;
  }
};
