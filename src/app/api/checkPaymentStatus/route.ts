import { NextResponse } from "next/server";
import PAYPAY from "@paypayopa/paypayopa-sdk-node";

// Configuring the PayPay SDK
PAYPAY.Configure({
  clientId: process.env.PAYPAY_API_KEY || "",
  clientSecret: process.env.PAYPAY_SECRET || "",
  merchantId: process.env.MERCHANT_ID,
  // productionMode: process.env.NODE_ENV === "production", // Automatically set based on environment
});

export async function POST(request: Request) {
  const { id } = await request.json(); // Extracting payment ID from request

  try {
    const response = await PAYPAY.GetPaymentDetails(id); // Attempting to get payment details
    return NextResponse.json(response.data); // Sending response back to client
  } catch (error) {
    console.error("PayPay Payment Status Error:", error); // Logging the error
    return new NextResponse(
      JSON.stringify({
        error: "支払いステータスの確認に失敗しました",
      }),
      {
        status: 400,
      }
    );
  }
}
