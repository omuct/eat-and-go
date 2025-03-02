// /app/api/orders/complete/route.ts
import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const orderId = searchParams.get("orderId");

  // 注文完了ページにリダイレクト
  return NextResponse.redirect(
    new URL(`/orders/complete-static?orderId=${orderId}`, request.url)
  );
}
