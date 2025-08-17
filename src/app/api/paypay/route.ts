import { NextResponse } from "next/server";
import PAYPAY from "@paypayopa/paypayopa-sdk-node";
import { randomUUID } from "crypto";

// PayPay SDK設定
function configurePayPay() {
  const config = {
    clientId: process.env.PAYPAY_CLIENT_ID || "",
    clientSecret: process.env.PAYPAY_CLIENT_SECRET || "",
    merchantId: process.env.PAYPAY_MERCHANT_ID || "",
    productionMode: false, // 常にサンドボックス環境
  };

  console.log("PayPay設定:", {
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret,
    hasMerchantId: !!config.merchantId,
    merchantId: config.merchantId,
    productionMode: config.productionMode,
    clientIdLength: config.clientId?.length || 0,
    clientSecretLength: config.clientSecret?.length || 0,
    env: process.env.NODE_ENV,
    // デバッグ用：先頭4文字のみ表示
    clientIdPreview: config.clientId?.substring(0, 4) || "none",
    merchantIdPreview: config.merchantId?.substring(0, 4) || "none",
  });

  PAYPAY.Configure(config);

  // 設定確認
  console.log("PayPay SDK設定完了");

  return config;
}

export async function POST(request: Request) {
  try {
    // リクエストデータの取得
    const body = await request.json();
    console.log("PayPay APIリクエストボディ:", body);

    // リクエスト形式の確認と amount の抽出
    let amount;
    let merchantPaymentId;
    let orderDescription;
    let redirectUrl;
    let expiryDate;
    let userAgent;

    if (body.amount && typeof body.amount === "object" && body.amount.amount) {
      // 新しい形式: { amount: { amount: 100, currency: "JPY" } }
      amount = body.amount.amount;
      merchantPaymentId = body.merchantPaymentId;
      orderDescription = body.orderDescription;
      redirectUrl = body.redirectUrl;
      expiryDate = body.expiryDate;
      userAgent = body.userAgent;
      console.log("新しい形式で金額抽出:", {
        originalAmount: body.amount,
        extractedAmount: amount,
      });
    } else if (body.amount && typeof body.amount === "number") {
      // 従来の形式: { amount: 100 }
      amount = body.amount;
      merchantPaymentId = body.orderId;
      orderDescription = body.description;
      console.log("従来の形式で金額抽出:", { amount });
    } else {
      console.error("不正なamount形式:", {
        body,
        amountType: typeof body.amount,
        amountValue: body.amount,
      });
      return NextResponse.json(
        { error: "有効な金額を指定してください", receivedData: body },
        { status: 400 }
      );
    }

    // 金額の型チェックと変換
    const numericAmount = Number(amount);
    console.log("金額変換チェック:", {
      originalAmount: amount,
      numericAmount,
      isNaN: isNaN(numericAmount),
    });

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      console.error("無効な金額:", {
        amount,
        numericAmount,
        isNaN: isNaN(numericAmount),
      });
      return NextResponse.json(
        {
          error:
            "有効な金額を指定してください（金額は0より大きい数値である必要があります）",
          receivedAmount: amount,
        },
        { status: 400 }
      );
    }

    console.log("抽出された金額:", { amount, numericAmount });

    // PayPay SDK設定
    const config = configurePayPay();

    // 必要な環境変数の確認
    if (!config.clientId || !config.clientSecret || !config.merchantId) {
      console.error("PayPay環境変数が不足:", config);
      return NextResponse.json(
        {
          error: "PayPay設定が不完全です",
          details: {
            hasClientId: !!config.clientId,
            hasClientSecret: !!config.clientSecret,
            hasMerchantId: !!config.merchantId,
          },
        },
        { status: 500 }
      );
    }

    // 決済ID生成（リクエストから取得されていない場合）
    if (!merchantPaymentId) {
      merchantPaymentId = randomUUID();
    }

    // リダイレクトURL構築（リクエストから取得されていない場合）
    if (!redirectUrl) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000");
      redirectUrl = `${baseUrl}/orders/payment-status/${merchantPaymentId}`;
    }

    // PayPay決済ペイロード
    const payload: any = {
      merchantPaymentId,
      amount: {
        amount: Math.floor(numericAmount), // 確実に整数にする
        currency: "JPY",
      },
      codeType: "ORDER_QR",
      orderDescription: orderDescription || "学食アプリ - 商品注文",
      isAuthorization: false,
      redirectUrl,
      redirectType: "WEB_LINK",
    };

    // 有効期限を設定（リクエストに含まれている場合）
    if (expiryDate) {
      payload.expiryDate = expiryDate;
    }

    console.log("PayPay決済リクエスト:", {
      merchantPaymentId,
      amount: payload.amount,
      redirectUrl,
    });

    // PayPay API呼び出し
    const response = await PAYPAY.QRCodeCreate(payload);
    console.log("PayPay APIレスポンス:", response);

    // レスポンス処理
    const responseData = response as any;

    if (
      !responseData.STATUS ||
      (responseData.STATUS !== 200 && responseData.STATUS !== 201)
    ) {
      console.error("PayPay API エラー:", responseData);
      return NextResponse.json(
        {
          error: "PayPay決済の作成に失敗しました",
          details: responseData.BODY?.resultInfo || responseData,
        },
        { status: 400 }
      );
    }

    // 成功レスポンス
    const paymentData = responseData.BODY?.data;
    console.log("PayPay決済作成成功:", {
      merchantPaymentId,
      qrCodeUrl: paymentData?.url,
      deeplink: paymentData?.deeplink,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: paymentData?.url,
        deeplink: paymentData?.deeplink,
        merchantPaymentId,
        expiryDate: paymentData?.expiryDate,
      },
      merchantPaymentId,
      qrCodeUrl: paymentData?.url,
      deeplink: paymentData?.deeplink,
      redirectUrl,
      expiryDate: paymentData?.expiryDate,
    });
  } catch (error) {
    console.error("PayPay決済エラー:", error);

    return NextResponse.json(
      {
        error: "決済処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
