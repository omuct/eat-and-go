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
    const response = await fetch("/api/orders/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        orderNumber,
        customerName,
        orderItems,
        totalAmount,
        orderDate,
        pickupTime,
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
