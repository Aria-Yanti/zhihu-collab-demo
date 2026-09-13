import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知乎经验网络",
  description: "让还没有被写出来的经验，也能成为知乎的答案。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
