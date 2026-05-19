import type { Metadata } from "next";
import "./globals.css";
import Header from "@/src/components/layout/Header";

export const metadata: Metadata = {
  title: "MEDIGER Doctor Dashboard",
  description: "당뇨병 환자 관리 의사 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-gray-50">
        <Header />
        <main className="pt-14 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
