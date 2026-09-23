import { CurrencyConfig } from "@/components/BrandingContext";

// Deliberately dumb — .toLocaleString() for thousands-grouping only, no full
// Intl.NumberFormat currency machinery (that would need locale data this
// isn't trying to model). Same implementation as pharmacy-portal's
// lib/currency.ts — replaces every hardcoded "AED" literal with a currency
// read from the org's country config, so an India-scoped org shows INR
// instead of AED with no per-screen special-casing.
export function formatCurrency(amount: number | string, currency: CurrencyConfig): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const formatted = Number.isFinite(n) ? n.toLocaleString() : String(amount);
  return currency.position === "prefix" ? `${currency.symbol} ${formatted}` : `${formatted} ${currency.symbol}`;
}
