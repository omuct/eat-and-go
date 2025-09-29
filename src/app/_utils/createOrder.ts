import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { generateOrderNumber } from "./orderNumberGenerator";
import { sendOrderConfirmationEmail } from "./sendOrderEmail";
import { CartItem } from "../_types/cart";
import * as Brevo from "@getbrevo/brevo";
import { render } from "@react-email/render";
import { OrderConfirmationEmail } from "../../../emails/order-confirmation";

const apiInstance = new Brevo.TransactionalEmailsApi();

interface OrderCreationPayload {
  userId: string;
  cartItems: CartItem[];
  paymentMethod: "cash" | "credit" | "paypay";
  paypayMerchantPaymentId?: string;
  supabaseClient: SupabaseClient;
}

export async function createOrder(payload: OrderCreationPayload) {
  const {
    userId,
    cartItems,
    paymentMethod,
    paypayMerchantPaymentId,
    supabaseClient,
  } = payload;

  apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY!
  );

  if (!cartItems || cartItems.length === 0) {
    throw new Error("カートが空です。");
  }

  const firstItem = cartItems[0];

  const { data: foodData, error: foodError } = await supabaseClient
    .from("foods")
    .select("store_name")
    .eq("id", firstItem.food_id)
    .single();

  if (foodError || !foodData) {
    throw new Error("商品の店舗名が見つかりません。");
  }

  const { data: storeData, error: storeError } = await supabaseClient
    .from("stores")
    .select("id")
    .eq("name", foodData.store_name)
    .single();

  if (storeError || !storeData) {
    throw new Error("店舗情報が見つかりません。");
  }

  const storeId = storeData.id;

  const orderNumber = await generateOrderNumber(storeId);
  let totalAmount = 0;
  let discountAmount = 0;
  cartItems.forEach((item) => {
    totalAmount += item.total_price;
    if (item.is_takeout) {
      discountAmount += 10 * item.quantity;
    }
  });

  const finalAmount = totalAmount - discountAmount;

  const { data: order, error: orderError } = await supabaseClient
    .from("orders")
    .insert({
      user_id: userId,
      store_id: storeId,
      order_number: orderNumber,
      total_amount: finalAmount,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
      status: "pending",
      paypay_merchant_payment_id: paypayMerchantPaymentId,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const orderDetailsData = cartItems.map((item) => ({
    order_id: order.id,
    food_id: item.food_id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    size: item.size,
    is_takeout: item.is_takeout,
    amount: item.total_price,
  }));

  const { error: detailsError } = await supabaseClient
    .from("order_details")
    .insert(orderDetailsData);

  if (detailsError) throw detailsError;

  // 6. カートを空にする
  try {
    const idsToDelete = cartItems.map((i) => i.id);
    if (idsToDelete.length > 0) {
      await supabaseClient.from("cart").delete().in("id", idsToDelete);
    }
  } catch (e) {
    console.error("カート部分削除エラー:", e);
    // 失敗しても注文自体は作成済みのため致命的ではない。ログのみ残す。
  }

  // 7. 確認メールを送信
  try {
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("name, email")
      .eq("id", userId)
      .single();

    const userEmail = profileData?.email;

    const userName = profileData?.name || "お客様";

    if (userEmail) {
      const emailHtml = await render(
        OrderConfirmationEmail({
          orderNumber: order.order_number,
          customerName: userName,
          orderItems: cartItems,
          totalAmount: finalAmount,
          orderDate: new Date().toLocaleDateString("ja-JP"),
        })
      );

      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: userEmail, name: userName }];
      sendSmtpEmail.sender = {
        email: process.env.EMAIL_FROM!,
        name: "EAT & GO",
      };
      sendSmtpEmail.subject = `【EAT & GO】ご注文ありがとうございます - 注文番号: ${order.order_number}`;
      sendSmtpEmail.htmlContent = emailHtml;

      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log("Order confirmation email sent via Brevo.");
    }
  } catch (emailError) {
    console.error("Order confirmation email sending failed:", emailError);
  }

  return { orderId: order.id, orderNumber: order.order_number };
}
