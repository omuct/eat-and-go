import { NextResponse } from "next/server";
import crypto from "crypto"; // Importing crypto for generating unique IDs
import PAYPAY from "@paypayopa/paypayopa-sdk-node"; // Importing PayPay SDK
const { v4: uuidv4 } = require("uuid");
// POST Handler
// PayPay SDK設定（環境に応じて自動切り替え）
console.log("PayPay SDK設定を初期化中...");

// 環境変数の確認
const clientId = process.env.PAYPAY_API_KEY || "";
const clientSecret = process.env.PAYPAY_SECRET || "";
const merchantId = process.env.MERCHANT_ID || "";
const isProduction = process.env.NODE_ENV === "production";
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL ||
  "http://localhost:3000";

console.log("PayPay環境変数確認:", {
  hasClientId: !!clientId,
  hasClientSecret: !!clientSecret,
  hasMerchantId: !!merchantId,
  clientIdPrefix: clientId ? clientId.substring(0, 10) + "..." : "未設定",
  merchantId: merchantId,
  isProduction: isProduction,
  baseUrl: baseUrl,
});

PAYPAY.Configure({
  clientId: clientId,
  clientSecret: clientSecret,
  merchantId: merchantId,
  productionMode: false, // サンドボックス環境では必ずfalse（本番移行時に変更）
});
export async function POST(request: Request) {
  try {
    const { amount } = await request.json(); // Extracting amount from request

    // 環境変数の検証
    if (
      !process.env.PAYPAY_API_KEY ||
      !process.env.PAYPAY_SECRET ||
      !process.env.MERCHANT_ID
    ) {
      console.error("PayPay環境変数が不足しています");
      return new NextResponse(
        JSON.stringify({
          error: "PayPay設定が不完全です。管理者にお問い合わせください。",
        }),
        { status: 500 }
      );
    }

    const merchantPaymentId = uuidv4(); // 支払いID（一意になるようにuuidで生成）
    const orderDescription = "商品注文"; // Description of the order

    // 環境に応じたリダイレクトURLの構築
    const redirectUrl = (() => {
      if (process.env.NEXT_PUBLIC_BASE_URL) {
        return `${process.env.NEXT_PUBLIC_BASE_URL}/orders/payment-status/${merchantPaymentId}`;
      } else if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/orders/payment-status/${merchantPaymentId}`;
      } else {
        return `http://localhost:3000/orders/payment-status/${merchantPaymentId}`;
      }
    })();

    const payload = {
      merchantPaymentId: merchantPaymentId,
      amount: {
        amount: parseInt(amount),
        currency: "JPY",
      },
      codeType: "ORDER_QR",
      orderDescription: orderDescription,
      isAuthorization: false,
      redirectUrl: redirectUrl,
      redirectType: "WEB_LINK",
    };

    console.log("PayPay決済リクエスト:", {
      merchantPaymentId,
      amount: payload.amount,
      redirectUrl: payload.redirectUrl,
    });

    const response = await PAYPAY.QRCodeCreate(payload); // Attempting to create a payment

    console.log("PayPay API レスポンス:", response);

    // レスポンスの検証（PayPayの成功ステータスは200または201）
    const responseAny = response as any;
    if (
      responseAny.STATUS &&
      responseAny.STATUS !== 200 &&
      responseAny.STATUS !== 201
    ) {
      console.error("PayPay API エラー:", responseAny);
      return new NextResponse(
        JSON.stringify({
          error: "PayPay決済の作成に失敗しました",
          details: responseAny.BODY?.resultInfo || "不明なエラー",
        }),
        { status: 400 }
      );
    }

    // 成功時のレスポンス処理
    console.log("PayPay決済作成成功:", {
      status: responseAny.STATUS,
      merchantPaymentId: responseAny.BODY?.data?.merchantPaymentId,
      qrCodeUrl: responseAny.BODY?.data?.url,
      deeplink: responseAny.BODY?.data?.deeplink,
    });

    return NextResponse.json(response); // Sending response back to client
  } catch (error) {
    console.error("PayPay Payment Error:", error); // Logging the error

    return new NextResponse(
      JSON.stringify({
        error: "支払いの処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : "不明なエラー",
      }),
      { status: 400 }
    );
  }
}
