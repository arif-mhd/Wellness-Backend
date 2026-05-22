import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SuperTokensProvider from "@/components/SuperTokensProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wellness – Admin Portal",
  description: "System administration for the Wellness healthcare platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
