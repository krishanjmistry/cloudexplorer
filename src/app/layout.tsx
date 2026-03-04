import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import { DuckDBProvider } from "../context/DuckDBContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "cloudexplorer",
  description: "Tool to visualize and explore cloud resources, RBAC, and IAM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <DuckDBProvider>
          <AuthProvider>{children}</AuthProvider>
        </DuckDBProvider>
      </body>
    </html>
  );
}
