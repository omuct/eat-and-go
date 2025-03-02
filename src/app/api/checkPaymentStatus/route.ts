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
    if ("data" in response) {
      const responseData = response.data as { status: string }; // 明示的に型を指定
      return NextResponse.json(responseData); // Sending response back to client
    } else if ("message" in response) {
      throw new Error(response.message as string);
    } else {
      throw new Error("Unknown error");
    }
  } catch (error) {
    console.error("PayPay Payment Status Error:", error); // Logging the error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(
      JSON.stringify({
        error: "支払いステータスの確認に失敗しました",
        details: errorMessage,
      }),
      {
        status: 500,
      }
    );
  }
}
