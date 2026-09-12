import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zhihu Collab Demo",
  description: "知乎黑客松协作式问题探索 Demo"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
