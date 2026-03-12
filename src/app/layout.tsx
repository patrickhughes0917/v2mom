import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engineering V2MOM Dashboard",
  description: "Centralized dashboard for measuring engineering progress across Vision, Values, Methods, Obstacles, and Measures",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
