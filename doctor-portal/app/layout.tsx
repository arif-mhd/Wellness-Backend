import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SuperTokensProvider from "@/components/SuperTokensProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wellness – Doctor Portal",
  description: "Manage your patients, appointments, and consultations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/*
          SuperTokensProvider is a Client Component.
          It initialises the SuperTokens SDK in the browser.
          All child pages can now use supertokens-web-js functions.
        */}
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
