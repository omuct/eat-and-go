import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { CartItem } from "@/app/_types/cart";
import { generateOrderNumber } from "@/app/_utils/orderNumberGenerator";
import { sendOrderConfirmationEmail } from "@/app/_utils/sendOrderEmail";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, paymentMethod, totalAmount, discountAmount, cartItems } =
    body;

  try {
    const order_number = await generateOrderNumber(body.storeId);
    const orderData = {
      user_id: userId,
      total_amount: totalAmount - discountAmount,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
      status: "pending",
      created_at: new Date().toISOString(),
      order_number,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

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

    const { error: clearCartError } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", userId);

    if (clearCartError) throw clearCartError;

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, name")
        .eq("id", userId)
        .single();

      if (userData?.email) {
        const emailOrderItems = cartItems.map((item: CartItem) => ({
          id: item.food_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }));

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
