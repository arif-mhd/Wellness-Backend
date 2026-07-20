import type { Metadata } from "next";
import { Inter, Marcellus, Outfit, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import SuperTokensProvider from "@/components/SuperTokensProvider";

const inter = Inter({ subsets: ["latin"] });

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "Wellness – Clinic Portal",
  description: "Manage your clinic, doctors, patients, and consultations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${marcellus.variable} ${outfit.variable} ${bricolage.variable}`}>
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
