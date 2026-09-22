import { CurrencyConfig } from "@/components/OrgCurrencyContext";

// Deliberately dumb — .toLocaleString() for thousands-grouping only. Same
// implementation as pharmacy-portal's and doctor-portal's lib/currency.ts, so
// every surface of the platform formats money identically.
export function formatCurrency(amount: number | string, currency: CurrencyConfig): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const formatted = Number.isFinite(n) ? n.toLocaleString() : String(amount);
  return currency.position === "prefix" ? `${currency.symbol} ${formatted}` : `${formatted} ${currency.symbol}`;
}
