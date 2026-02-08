import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Computation Theory Simulator",
  description: "Created by KebanFiru",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
