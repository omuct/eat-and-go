import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/app/_utils/createOrder";
import { createClient } from "@supabase/supabase-js";
import { CartItem } from "@/app/_types/cart";

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${authToken}` } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "無効なユーザーです" },
        { status: 401 }
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    // Supabaseでは、データが存在しない場合に profileError が発生します
    if (profileError) {
      const { error: createError } = await supabase.from("profiles").insert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "ゲスト",
        email: user.email, // emailも保存しておくと良いでしょう
      });
      if (createError) {
        // ここでエラーになっても注文処理は続行して良い場合が多いですが、
        // 念のためログには残します。
        console.error("プロファイル作成エラー:", createError);
      }
    }

    const {
      cartItems,
      paymentMethod,
    }: { cartItems: CartItem[]; paymentMethod: "cash" } = await request.json();

    if (!cartItems || !paymentMethod) {
      return NextResponse.json(
        { error: "必要な情報が不足しています" },
        { status: 400 }
      );
    }

    const { orderId, orderNumber } = await createOrder({
      userId: user.id,
      cartItems,
      paymentMethod,
      supabaseClient: supabase,
    });

    return NextResponse.json({ success: true, orderId, orderNumber });
  } catch (error) {
    console.error("[CASH_ORDER_CREATION_ERROR]", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: "注文の作成に失敗しました", details: errorMessage },
      { status: 500 }
    );
  }
}
