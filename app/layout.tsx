import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent报文解析工作流",
  description: "根据传入Hex报文，经过AIAgent对报文进行解析，提取关键信息，并根据配置的规则发送HTTP请求",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
