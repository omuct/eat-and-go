import { canSendEmail } from "./canSendEmail";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface SendOrderConfirmationEmailProps {
  to: string;
  orderNumber: string;
  customerName?: string;
  orderItems: OrderItem[];
  totalAmount: number;
  orderDate?: string;
  pickupTime?: string;
}

/**
 * 注文確認メールを送信する
 */
export async function sendOrderConfirmationEmail({
  to,
  orderNumber,
  customerName,
  orderItems,
  totalAmount,
  orderDate = new Date().toLocaleDateString("ja-JP"),
  pickupTime,
  orderId,
}: SendOrderConfirmationEmailProps & { orderId?: string }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // profilesテーブルに存在するメールのみ送信
    const { canSendEmail } = await import("./canSendEmail");
    const isAllowed = await canSendEmail(to);
    if (!isAllowed) {
      return {
        success: false,
        error: "このメールアドレスには送信できません (profilesに存在しません)",
      };
    }

    const endpoint = "/api/orders/send-confirmation";
    let fetchUrl;

    // サーバーサイドで実行されているか（windowオブジェクトがないか）で判断
    if (typeof window === "undefined") {
      // サーバーサイドの場合：Vercelの環境変数から完全なURLを構築
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      fetchUrl = new URL(endpoint, baseUrl).toString();
    } else {
      // ブラウザ（クライアントサイド）の場合：相対パスを使用
      fetchUrl = endpoint;
    }

    const response = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        orderNumber,
        customerName,
        orderItems,
        totalAmount,
        orderDate,
        pickupTime,
        orderId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send email");
    }

    const result = await response.json();
    console.log("Order confirmation email sent:", result);

    return { success: true };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
