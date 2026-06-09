import type { Metadata } from "next";
import { Inter, Marcellus, Outfit, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import SuperTokensProvider from "@/components/SuperTokensProvider";

const inter      = Inter({ subsets: ["latin"] });
const marcellus  = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-marcellus" });
const outfit     = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const bricolage  = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  title: "Pharmacy Central – Wellness",
  description: "Manage your pharmacy products and inventory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${marcellus.variable} ${outfit.variable} ${bricolage.variable}`}>
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
