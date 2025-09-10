import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { CartItem } from "@/app/_types/cart";
import { generateOrderNumber } from "@/app/_utils/orderNumberGenerator";
import { sendOrderConfirmationEmail } from "@/app/_utils/sendOrderEmail";

// 支払い処理
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, paymentMethod, totalAmount, discountAmount, cartItems } =
    body;

  try {
    // 注文番号を生成
    const order_number = await generateOrderNumber(body.storeId);

    // 注文データを作成
    const orderData = {
      user_id: userId,
      total_amount: totalAmount - discountAmount,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
      status: "pending",
      created_at: new Date().toISOString(),
      order_number, // 追加
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

    // ユーザー情報を取得してメール送信
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, name")
        .eq("id", userId)
        .single();

      if (userData?.email) {
        // 注文アイテムをメール用の形式に変換
        const emailOrderItems = cartItems.map((item: CartItem) => ({
          id: item.food_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }));

        // メール送信（非同期、エラーがあってもログに記録するだけ）
        const emailResult = await sendOrderConfirmationEmail({
          to: userData.email,
          orderNumber: order.order_number,
          customerName: userData.name || "お客様",
          orderItems: emailOrderItems,
          totalAmount: totalAmount - discountAmount,
          orderDate: new Date().toLocaleDateString("ja-JP"),
        });

        if (!emailResult.success) {
          console.error(
            "Failed to send confirmation email:",
            emailResult.error
          );
        }
      }
    } catch (emailError) {
      console.error("Error during email process:", emailError);
      // メール送信の失敗は注文処理に影響しない
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
