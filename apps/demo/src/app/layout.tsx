import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "getstatusforge.com demo",
  description: "Interactive playground for normalizing HTTP and transport errors."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
