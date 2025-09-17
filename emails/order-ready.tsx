import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface OrderReadyEmailProps {
  customerName?: string;
  orderNumber: string;
}

export const OrderReadyEmail = ({
  customerName = "お客様",
  orderNumber,
}: OrderReadyEmailProps) => (
  <Html>
    <Head />
    <Preview>ご注文の準備ができました</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerTitle}>EAT & GO</Text>
        </Section>
        <Heading style={heading}>ご注文の準備ができました</Heading>
        <Text style={paragraph}>{customerName}様</Text>
        <Text style={paragraph}>
          ご注文いただいた商品の準備が整いました。カウンターまでお越しください。
        </Text>
        <Section style={orderInfo}>
          <Row>
            <Column>
              <Text style={label}>注文番号</Text>
              <Text style={value}>{orderNumber}</Text>
            </Column>
          </Row>
        </Section>
        <Text style={paragraph}>
          お受け取りの際に、この画面か注文番号がわかるものをご提示ください。
        </Text>
        <Text style={paragraph}>
          ご利用いただき、誠にありがとうございます。
        </Text>
      </Container>
    </Body>
  </Html>
);

export default OrderReadyEmail;

// --- スタイル定義 ---
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
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

const heading = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
};

const paragraph = {
  color: "#555",
  fontSize: "16px",
  lineHeight: "24px",
  padding: "0 20px",
};

const orderInfo = {
  padding: "20px",
  margin: "20px 0",
  backgroundColor: "#f0f4f8",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
};

const label = {
  fontSize: "14px",
  color: "#777",
  margin: 0,
};

const value = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#333",
  margin: "4px 0 0 0",
};
