import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getConfiguredAppUrl } from "@/lib/app-url";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const configuredAppUrl = getConfiguredAppUrl();

export const metadata: Metadata = {
  metadataBase: configuredAppUrl ?? undefined,
  title: "集盒 FolioBox — 把零散项目整理成拿得出手的UI/UX设计师作品集",
  description:
    "面向UI/UX设计师的作品集整理工具。导入设计稿和个人简历，补充项目关键信息，20 分钟内完成第一版作品集初稿。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
