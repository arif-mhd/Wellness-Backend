/**
 * Points at a public FHIR R4 sandbox today, standing in for the clinic's
 * Cortex EMR FHIR endpoint until real credentials are available. Swapping to
 * the production Cortex URL (and adding OAuth2/SMART-on-FHIR auth) later
 * should only require changes in this file and fhirClient.ts.
 */
export const FHIR_BASE_URL = process.env.FHIR_BASE_URL || "https://hapi.fhir.org/baseR4";
