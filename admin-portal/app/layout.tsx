import type { Metadata } from "next";
import { Outfit, Marcellus } from "next/font/google";
import "./globals.css";
import SuperTokensProvider from "@/components/SuperTokensProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
});

export const metadata: Metadata = {
  title: "Wellness Central – Admin Portal",
  description: "System administration for the Wellness Central healthcare platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${marcellus.variable}`}>
      <body>
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
