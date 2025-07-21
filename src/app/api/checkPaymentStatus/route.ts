import { NextResponse } from "next/server";
import PAYPAY from "@paypayopa/paypayopa-sdk-node";

// PayPay SDK設定（サンドボックス環境）
PAYPAY.Configure({
  clientId: process.env.PAYPAY_API_KEY || "",
  clientSecret: process.env.PAYPAY_SECRET || "",
  merchantId: process.env.MERCHANT_ID || "",
  productionMode: false, // サンドボックス環境では必ずfalse
});

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: "Payment ID is required" }),
        { status: 400 }
      );
    }

    console.log("決済ステータス確認中:", id);

    // PayPay APIで決済ステータスを確認
    const response = await PAYPAY.GetCodePaymentDetails([id]);

    console.log("PayPay ステータスレスポンス:", JSON.stringify(response, null, 2));

    // レスポンスの処理
    const responseAny = response as any;
    
    if (responseAny.BODY?.data) {
      const status = responseAny.BODY.data.status || "PENDING";
      console.log("決済ステータス:", status);

      return NextResponse.json({ 
        status: status, 
        data: responseAny.BODY.data 
      });
    } else if (responseAny.STATUS === 200 || responseAny.STATUS === 201) {
      // 決済データがまだ存在しない場合（作成直後）
      console.log("決済データ準備中");
      return NextResponse.json({
        status: "PENDING",
        message: "Payment is being processed",
      });
    } else {
      console.log("決済データが見つかりません:", responseAny);
      return NextResponse.json({
        status: "FAILED",
        error: "Payment data not found",
      });
    }
  } catch (error) {
    console.error("決済ステータス確認エラー:", error);
    return new NextResponse(
      JSON.stringify({
        status: "FAILED",
        error: "決済ステータスの確認に失敗しました",
      }),
      { status: 500 }
    );
  }
}
