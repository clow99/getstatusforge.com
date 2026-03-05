import type { Metadata } from "next";
import "@velocityuikit/velocityui/dist/style.css";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "StatusForge - Error Normalization",
  description: "Interactive playground for normalizing HTTP and transport errors."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
