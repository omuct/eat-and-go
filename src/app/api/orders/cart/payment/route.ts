import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { CartItem } from "@/app/_types/cart";

// 支払い処理
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, paymentMethod, totalAmount, discountAmount, cartItems } =
    body;

  try {
    // 注文データを作成
    const orderData = {
      user_id: userId,
      total_amount: totalAmount - discountAmount,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    // 注文を保存
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

    // 注文詳細を保存
    const orderDetailsData = cartItems.map((item: CartItem) => ({
      order_id: order.id,
      food_id: item.food_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      is_takeout: item.is_takeout,
      amount: item.total_price - (item.is_takeout ? 10 * item.quantity : 0),
    }));

    const { error: detailsError } = await supabase
      .from("order_details")
      .insert(orderDetailsData);

    if (detailsError) throw detailsError;

    // カートを空にする
    const { error: clearCartError } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", userId);

    if (clearCartError) throw clearCartError;

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
