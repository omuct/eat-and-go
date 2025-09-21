import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface OrderReadyEmailProps {
  customerName?: string;
  orderNumber: string;
}

export const OrderReadyEmail = ({
  customerName = "お客様",
  orderNumber,
}: OrderReadyEmailProps) => {
  const previewText = `ご注文の準備ができました！ 注文番号: ${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerTitle}>EAT & GO</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>ご注文の準備ができました！</Heading>

            <Text style={text}>{customerName}様</Text>

            <Text style={text}>ご注文いただいた商品の準備が整いました。</Text>

            <Section style={orderInfoSection}>
              <Text style={orderInfoLabel}>注文番号</Text>
              <Text style={orderNumberValue}>{orderNumber}</Text>
            </Section>

            <Section style={noticeSection}>
              <Text style={noticeTitle}>【重要】商品の受け取りについて</Text>
              <Text style={noticeText}>
                ✓ カウンターまでお越しください
                <br />✓
                お受け取りの際に、この画面か注文番号がわかるものをご提示ください
              </Text>
            </Section>

            <Text style={text}>ご利用いただき、誠にありがとうございます。</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderReadyEmail;

// --- スタイル定義 (order-confirmation.tsxから流用・調整) ---

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  borderRadius: "8px",
  overflow: "hidden",
  width: "100%",
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
  padding: "32px",
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 20px",
  textAlign: "center" as const,
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
  textAlign: "center" as const,
};

const orderInfoLabel = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 8px",
};

const orderNumberValue = {
  color: "#1f2937",
  fontSize: "32px",
  fontWeight: "700",
  margin: "0",
};

const noticeSection = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fcd34d",
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
  lineHeight: "1.8",
  margin: "0",
};
