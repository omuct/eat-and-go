import { NextResponse } from "next/server";
import PAYPAY from "@paypayopa/paypayopa-sdk-node";

function configurePayPay() {
  PAYPAY.Configure({
    clientId: process.env.PAYPAY_CLIENT_ID || process.env.PAYPAY_API_KEY || "",
    clientSecret:
      process.env.PAYPAY_CLIENT_SECRET || process.env.PAYPAY_SECRET || "",
    merchantId: process.env.PAYPAY_MERCHANT_ID || process.env.MERCHANT_ID || "",
    productionMode: false,
  });
}

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "決済IDが必要です" }, { status: 400 });
    }
    configurePayPay();
    console.log("決済ステータス確認中:", id);

    const response = await PAYPAY.GetCodePaymentDetails([id]);
    console.log("PayPay ステータスレスポンス:", response);

    const responseData = response as any;

    if (responseData.STATUS === 200 && responseData.BODY?.data) {
      const paymentData = responseData.BODY.data;
      const status = paymentData.status || "PENDING";

      console.log("決済ステータス:", status);

      return NextResponse.json({
        success: true,
        status,
        merchantPaymentId: paymentData.merchantPaymentId,
        amount: paymentData.amount,
        orderDescription: paymentData.orderDescription,
        acceptedAt: paymentData.acceptedAt,
        data: paymentData,
      });
    }

    if (responseData.STATUS === 404) {
      return NextResponse.json({
        success: true,
        status: "PENDING",
        message: "決済処理中です",
      });
    }

    console.error("PayPay ステータス確認エラー:", responseData);
    return NextResponse.json({
      success: false,
      status: "FAILED",
      error: "決済ステータスの確認に失敗しました",
      details: responseData.BODY?.resultInfo,
    });
  } catch (error) {
    console.error("決済ステータス確認エラー:", error);

    return NextResponse.json(
      {
        success: false,
        status: "FAILED",
        error: "決済ステータス確認処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
