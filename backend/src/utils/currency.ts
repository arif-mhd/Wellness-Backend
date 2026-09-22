import { CurrencyConfig } from "../config/countries";
import { getCountryConfigForOrgId, getDefaultOrgIdForRegistration } from "./orgScope";
import { doctorsContainer } from "../config/cosmos";

// For call sites with an orgId already in hand (e.g. via resolveOrgId(req)
// for a patient-initiated action with no doctor/clinic in the flow, like a
// direct lab/medicine/vaccine booking) — the same defaultCurrency lookup
// resolveCurrencyForDoctor uses, without the doctor->clinic->org hop.
export async function resolveCurrencyForOrgId(orgId: string): Promise<CurrencyConfig> {
  const countryConfig = await getCountryConfigForOrgId(orgId);
  return countryConfig.defaultCurrency;
}

// Resolves the currency a given doctor's fee/order amounts should be
// displayed in — via their clinic's org (same tenantId chain used for
// billing/insurance elsewhere), falling back to the platform default org for
// an independent doctor with no clinicId. Mirrors resolveTimezoneForDoctor
// in timezone.ts exactly — same chain, same reasoning.
export async function resolveCurrencyForDoctor(doctor: { clinicId?: string | null }): Promise<CurrencyConfig> {
  if (doctor.clinicId) {
    // Lazy import — same defensive pattern timezone.ts/orgScope.ts already
    // use for this exact function, keeping the clinicInsurance.ts ->
    // clinicScope.ts coupling scoped to where it's actually used rather than
    // a static module-level import.
    const { loadOrgDocForClinicId } = await import("../routes/clinicInsurance");
    const org = await loadOrgDocForClinicId(doctor.clinicId);
    if (org?.tenantId) {
      const countryConfig = await getCountryConfigForOrgId(org.tenantId);
      return countryConfig.defaultCurrency;
    }
  }
  const defaultOrgId = await getDefaultOrgIdForRegistration();
  const countryConfig = await getCountryConfigForOrgId(defaultOrgId);
  return countryConfig.defaultCurrency;
}

// Convenience wrapper for call sites (mostly notification-text generation)
// that only have a doctorId in hand, not an already-fetched doctor doc.
export async function resolveCurrencyForDoctorId(doctorId: string): Promise<CurrencyConfig> {
  const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read().catch(() => ({ resource: null as any }));
  return resolveCurrencyForDoctor(doctor ?? {});
}

// Formats an amount as currency text for notification/activity-log copy
// generated server-side (push, email, SMS, activity feed) — the single place
// that should ever combine a bare number with a currency symbol, so no
// call site hardcodes "AED"/"₹" directly.
export function formatCurrencyText(amount: number, currency: CurrencyConfig): string {
  const formatted = Number.isFinite(amount) ? amount.toLocaleString() : String(amount);
  return currency.position === "prefix" ? `${currency.symbol} ${formatted}` : `${formatted} ${currency.symbol}`;
}
