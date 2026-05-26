import type { Metadata } from "next";
import { Inter, Marcellus, Outfit } from "next/font/google";
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
      <body className={`${inter.className} ${marcellus.variable} ${outfit.variable}`}>
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
