import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/app/_utils/createOrder";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!authToken) {
      return NextResponse.json(
        { error: "認証トークンがありません" },
        { status: 401 }
      );
    }

    const supabaseWithAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${authToken}` } } }
    );

    const body = await request.json();
    const { userId, cartItems, merchantPaymentId } = body;

    if (!userId || !cartItems || !merchantPaymentId) {
      return NextResponse.json(
        { error: "必要な情報が不足しています" },
        { status: 400 }
      );
    }

    // 重複注文防止チェック
    const { data: existingOrder } = await supabaseWithAuth
      .from("orders")
      .select("id")
      .eq("paypay_merchant_payment_id", merchantPaymentId)
      .single();

    if (existingOrder) {
      return NextResponse.json(
        {
          message: "この決済は既に処理されています",
          orderId: existingOrder.id,
        },
        { status: 200 }
      );
    }

    // 共通関数を呼び出して注文を作成
    const { orderId, orderNumber } = await createOrder({
      userId,
      cartItems,
      paymentMethod: "paypay",
      paypayMerchantPaymentId: merchantPaymentId,
      supabaseClient: supabaseWithAuth,
    });

    return NextResponse.json({ success: true, orderId, orderNumber });
  } catch (error) {
    console.error("[PAYPAY_ORDER_CREATION_ERROR]", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: "注文の作成に失敗しました", details: errorMessage },
      { status: 500 }
    );
  }
}
