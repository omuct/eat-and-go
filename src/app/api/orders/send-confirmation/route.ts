import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { OrderConfirmationEmail } from "../../../../../emails/order-confirmation";
import { supabase } from "@/lib/supabaseClient";
import * as Brevo from "@getbrevo/brevo";

const apiInstance = new Brevo.TransactionalEmailsApi();

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

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to, name: customerName || "お客様" }];
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM!,
      name: "EAT & GO",
    };
    sendSmtpEmail.subject = `【EAT & GO】ご注文確認 - 注文番号: ${orderNumber}`;
    sendSmtpEmail.htmlContent = emailHtml;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

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
