import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { OrderConfirmationEmail } from "../../../../../emails/order-confirmation";
import { supabase } from "@/lib/supabaseClient";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log("Send confirmation API called");

    const body = await request.json();
    console.log("Request body:", body);

    const {
      orderId,
      orderNumber,
      customerName,
      orderItems,
      totalAmount,
      orderDate,
      pickupTime,
    } = body;

    // 必須フィールドの検証
    if (!orderId || !orderNumber || !orderItems || !totalAmount) {
      console.log("Missing required fields:", {
        orderId,
        orderNumber,
        orderItems,
        totalAmount,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Supabaseで注文情報からuser_idを取得
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", orderId)
      .single();
    if (orderError || !orderData?.user_id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Supabase Authからemailを取得
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", orderData.user_id)
      .single();
    if (userError || !userData?.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      );
    }
    const to = userData.email;

    console.log("Rendering email template...");

    // React EmailのテンプレートをHTMLに変換
    const emailHtml = await render(
      OrderConfirmationEmail({
        orderNumber,
        customerName,
        orderItems,
        totalAmount,
        orderDate,
        pickupTime,
      })
    );

    console.log("Email template rendered successfully");
    console.log("Sending email via Resend...");

    // 【開発環境】
    const verifiedEmails =
      process.env.VERIFIED_EMAILS?.split(",").map((email) => email.trim()) ||
      [];
    const isVerifiedEmail = verifiedEmails.includes(to);
    const devEmailOverride = process.env.DEV_EMAIL_OVERRIDE;

    console.log("Verified emails list:", verifiedEmails);
    console.log("User email:", to);
    console.log("Is verified:", isVerifiedEmail);

    const emailTo = isVerifiedEmail ? to : devEmailOverride || to;

    console.log(
      `Sending to: ${emailTo} (Original: ${to}, Verified: ${isVerifiedEmail}, Override: ${devEmailOverride})`
    );

    // 【本番環境用コード - コメントアウト】
    // 独自ドメイン認証完了後、以下のコードに置き換える
    /*
    // 本番環境では全てのユーザーのメールアドレスに直接送信
    const emailTo = to;
    console.log(`Sending to: ${emailTo} (Production mode)`);
    */

    // Resendでメール送信
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev", // 本番時変更
      to: [emailTo],
      subject: `【注文管理アプリ】ご注文確認 - 注文番号: ${orderNumber}`,
      html: emailHtml,
    });

    // 【本番環境用メール設定 - コメントアウト】
    /*
    // 本番環境
    
    // Option 1: Resend有料プラン
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@resend.dev",
      to: [emailTo],
      subject: `【モバイルオーダーアプリ】ご注文確認 - 注文番号: ${orderNumber}`,
      html: emailHtml,
    });
    
    */

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    console.log("Email sent successfully:", data);
    return NextResponse.json(
      { message: "Email sent successfully", emailId: data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
