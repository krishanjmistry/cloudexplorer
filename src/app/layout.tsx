import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "../context/auth_context";
import { DuckDBProvider } from "../context/db_context";

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
      <body className={`${inter.className} antialiased`}>
        <DuckDBProvider>
          <AuthProvider>{children}</AuthProvider>
        </DuckDBProvider>
      </body>
    </html>
  );
}
