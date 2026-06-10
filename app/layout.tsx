import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "尝试AI开发工作流demo",
  description: "这是正儿八经用AI生成的第一个React项目",
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
