import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
import { Preview } from "@react-email/preview";
import { Heading } from "@react-email/heading";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import * as React from "react";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderConfirmationEmailProps {
  orderNumber: string;
  customerName?: string;
  orderItems: OrderItem[];
  totalAmount: number;
  orderDate: string;
  pickupTime?: string;
}

export const OrderConfirmationEmail = ({
  orderNumber = "1234",
  customerName = "田中太郎",
  orderItems = [
    {
      id: "1",
      name: "カツ丼",
      price: 680,
      quantity: 1,
    },
    {
      id: "2",
      name: "親子丼",
      price: 620,
      quantity: 2,
    },
  ],
  totalAmount = 1920,
  orderDate = "2025年7月11日",
  pickupTime = "12:30",
}: OrderConfirmationEmailProps) => {
  const previewText = `ご注文ありがとうございます。注文番号: ${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerTitle}>EAT & GO</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>ご注文ありがとうございます！</Heading>

          <Text style={text}>{customerName}様</Text>

          <Text style={text}>
            ご注文が正常に受け付けられました。以下の内容でご確認ください。
          </Text>

          <Section style={orderInfoSection}>
            <Text style={orderInfoLabel}>注文番号: {orderNumber}</Text>
            <Text style={orderInfoLabel}>注文日時: {orderDate}</Text>
          </Section>

          <Section style={orderItemsSection}>
            <Heading style={h2}>ご注文内容</Heading>

            {orderItems.map((item) => (
              <Section key={item.id} style={itemSection}>
                <Text style={itemName}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={itemPrice}>
                  ¥{(item.price * item.quantity).toLocaleString()}
                </Text>
              </Section>
            ))}

            <Section style={totalSection}>
              <Text style={totalLabel}>合計金額</Text>
              <Text style={totalAmountStyle}>
                ¥{totalAmount.toLocaleString()}
              </Text>
            </Section>
          </Section>

          <Section style={noticeSection}>
            <Text style={noticeTitle}>【重要】受取について</Text>
            <Text style={noticeText}>
              ✓ 注文番号を控えておいてください
              <br />✓ 受取時に注文番号をお伝えください
            </Text>
          </Section>
        </Section>
      </Container>
    </Html>
  );
};

export default OrderConfirmationEmail;

// Styles
const container = {
  fontFamily: "Arial, sans-serif",
  margin: "0 auto",
  padding: "20px",
  maxWidth: "600px",
};

const header = {
  backgroundColor: "#2563eb",
  padding: "20px",
  textAlign: "center" as const,
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
};

const content = {
  padding: "20px",
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const h2 = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "600",
  margin: "24px 0 16px",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const orderInfoSection = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const orderInfoLabel = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const orderItemsSection = {
  margin: "32px 0",
};

const itemSection = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid #f3f4f6",
};

const itemName = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
  flex: "1",
};

const itemPrice = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
  textAlign: "right" as const,
};

const totalSection = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  margin: "16px 0",
};

const totalLabel = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0",
};

const totalAmountStyle = {
  color: "#dc2626",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0",
};

const noticeSection = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fbbf24",
  borderRadius: "8px",
  padding: "20px",
  margin: "32px 0",
};

const noticeTitle = {
  color: "#92400e",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const noticeText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};
