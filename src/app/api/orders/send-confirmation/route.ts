import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { OrderConfirmationEmail } from "../../../../../emails/order-confirmation";
import { supabase } from "@/lib/supabaseClient";
import * as Brevo from "@getbrevo/brevo";

// BrevoのAPIインスタンスを作成
const apiInstance = new Brevo.TransactionalEmailsApi();

//const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log("Send confirmation API called");
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY!
    );

    const body = await request.json();
    console.log("Request body:", body);

    const {
      to,
      orderId,
      orderNumber,
      customerName,
      orderItems,
      totalAmount,
      orderDate,
      pickupTime,
    } = body;

    // 必須フィールドの検証
    if (!to || !orderId || !orderNumber || !orderItems || !totalAmount) {
      console.log("Missing required fields:", {
        to,
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

    // 認証済みメールリスト取得
    let verifiedEmails: string[] = [];
    try {
      const { data: emailRows, error: emailError } = await supabase
        .from("verified_emails")
        .select("email");
      if (!emailError && emailRows) {
        verifiedEmails = emailRows.map((row: { email: string }) => row.email);
      }
    } catch (e) {
      console.error("verified_emails取得エラー", e);
    }
    const isVerifiedEmail = verifiedEmails.includes(to);
    const devEmailOverride = process.env.DEV_EMAIL_OVERRIDE;

    console.log("Verified emails list (Supabase):", verifiedEmails);
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

    // Brevoでメールを送信
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to, name: customerName || "お客様" }];
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM!,
      name: "EAT & GO",
    };
    sendSmtpEmail.subject = `【EAT & GO】ご注文確認 - 注文番号: ${orderNumber}`;
    sendSmtpEmail.htmlContent = emailHtml;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    /* Resendでメール送信
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev", // 本番時変更
      to: [emailTo],
      subject: `【注文管理アプリ】ご注文確認 - 注文番号: ${orderNumber}`,
      html: emailHtml,
    });
    */

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

    return NextResponse.json(
      { message: "Email sent successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
