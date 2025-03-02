import { NextResponse } from "next/server";
import PAYPAY from "@paypayopa/paypayopa-sdk-node";
const { v4: uuidv4 } = require("uuid");

// Configuring the PayPay SDK
PAYPAY.Configure({
  clientId: process.env.PAYPAY_API_KEY || "",
  clientSecret: process.env.PAYPAY_SECRET || "",
  merchantId: process.env.MERCHANT_ID,
  // productionMode: process.env.NODE_ENV === "production", // Automatically set based on environment
});

export async function POST(request: Request) {
  const { amount, items } = await request.json(); // Extracting amount and items from request
  const merchantPaymentId = uuidv4(); // 支払いID（一意になるようにuuidで生成）
  const orderDescription = items.map((item: any) => item.name).join(", "); // 商品名をカンマ区切りで連結
  const payload = {
    merchantPaymentId: merchantPaymentId,
    amount: {
      amount: parseInt(amount),
      currency: "JPY",
    },
    codeType: "ORDER_QR",
    orderDescription: orderDescription,
    isAuthorization: false,
    redirectUrl: `https://react-gakusyoku-app.vercel.app/payment/${merchantPaymentId}`, // リダイレクトURLを設定
    redirectType: "WEB_LINK",
  };

  try {
    const response = await PAYPAY.QRCodeCreate(payload); // Attempting to create a payment
    if ("data" in response) {
      const responseData = response.data as { url: string }; // 明示的に型を指定
      return NextResponse.json({ url: responseData.url }); // Sending response back to client
    } else if ("message" in response) {
      throw new Error(response.message as string);
    } else {
      throw new Error("Unknown error");
    }
  } catch (error) {
    console.error("PayPay Payment Error:", error); // Logging the error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(
      JSON.stringify({
        error: "支払いに失敗しました",
        details: errorMessage,
      }),
      {
        status: 500,
      }
    );
  }
}
