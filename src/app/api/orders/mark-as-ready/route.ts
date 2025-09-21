import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Brevo from "@getbrevo/brevo";
import { render } from "@react-email/render";
//import { Resend } from "resend";
import { OrderReadyEmail } from "../../../../../emails/order-ready";

//const resend = new Resend(process.env.RESEND_API_KEY);
const apiInstance = new Brevo.TransactionalEmailsApi();

export async function POST(request: NextRequest) {
  try {
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY!
    );

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "注文IDが必要です" }, { status: 400 });
    }

    // 1. ヘッダーからアクセストークンを取得
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    if (!authToken) {
      return NextResponse.json(
        { error: "認証トークンが必要です" },
        { status: 401 }
      );
    }

    /*
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    if (!authToken) {
      return NextResponse.json(
        { error: "認証トークンが必要です" },
        { status: 401 }
      );
    }
    */

    // 2. 受け取ったトークンで認証された、一時的なSupabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${authToken}` } } }
    );

    // 3. 操作しているユーザーが管理者・店員かどうかのセキュリティチェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "無効なユーザーです" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "store_staff") {
      return NextResponse.json(
        { error: "この操作を行う権限がありません" },
        { status: 403 }
      );
    }

    // 4. 注文データを取得し、注文者情報を結合する
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`*, profiles (name, email)`)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      );
    }

    // 5. 注文ステータスを更新する
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "ready" })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json(
        {
          error: "ステータスの更新に失敗しました",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // 6. 準備完了メールを送信する
    const customerEmail = orderData.profiles?.email;
    const customerName = orderData.profiles?.name;
    const orderNumber = orderData.order_number;

    if (customerEmail && orderNumber) {
      const emailHtml = await render(
        OrderReadyEmail({
          customerName: customerName || "お客様",
          orderNumber: orderNumber,
        })
      );

      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.to = [
        { email: customerEmail, name: customerName || "お客様" },
      ];
      sendSmtpEmail.sender = {
        email: process.env.EMAIL_FROM!,
        name: "EAT & GO",
      };
      sendSmtpEmail.subject = `【EAT & GO】ご注文の準備ができました - 注文番号: ${orderNumber}`;
      sendSmtpEmail.htmlContent = emailHtml;

      await apiInstance.sendTransacEmail(sendSmtpEmail);
    }

    /*
    if (customerEmail && orderNumber) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: customerEmail,
        subject: `【ご注文の準備ができました】注文番号: ${orderNumber}`,
        react: OrderReadyEmail({
          customerName: customerName || "お客様",
          orderNumber: orderNumber,
        }),
      });
    }
    */

    return NextResponse.json({
      success: true,
      message: "ステータスを更新し、メールを送信しました",
    });
  } catch (error) {
    console.error("準備完了処理エラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: "サーバー内部でエラーが発生しました", details: errorMessage },
      { status: 500 }
    );
  }
}
