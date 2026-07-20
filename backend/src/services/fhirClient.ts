import { FHIR_BASE_URL } from "../config/fhir";

export class FhirError extends Error {
  status: number;
  operationOutcome?: any;
  constructor(message: string, status: number, operationOutcome?: any) {
    super(message);
    this.status = status;
    this.operationOutcome = operationOutcome;
  }
}

async function fhirGet(pathOrUrl: string, params?: Record<string, string | number | undefined>): Promise<any> {
  const url = new URL(pathOrUrl.startsWith("http") ? pathOrUrl : `${FHIR_BASE_URL}/${pathOrUrl}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), { headers: { Accept: "application/fhir+json" } });
  const body: any = await res.json().catch(() => null);

  if (!res.ok) {
    const outcome = body?.resourceType === "OperationOutcome" ? body : undefined;
    const message =
      outcome?.issue?.[0]?.diagnostics ||
      outcome?.issue?.[0]?.details?.text ||
      `FHIR request failed (${res.status})`;
    throw new FhirError(message, res.status, outcome);
  }

  return body;
}

/** Runs a FHIR search and follows pagination links, returning the resolved resources (not the raw Bundle). */
export async function fhirSearch(
  resourceType: string,
  params: Record<string, string | number | undefined>,
  maxPages = 3
): Promise<any[]> {
  let bundle = await fhirGet(resourceType, params);
  const entries: any[] = [...(bundle.entry ?? [])];

  let pages = 1;
  while (pages < maxPages) {
    const next = (bundle.link ?? []).find((l: any) => l.relation === "next");
    if (!next) break;
    bundle = await fhirGet(next.url);
    entries.push(...(bundle.entry ?? []));
    pages++;
  }

  return entries.map((e) => e.resource).filter(Boolean);
}

export async function fhirGetResource(resourceType: string, id: string): Promise<any> {
  return fhirGet(`${resourceType}/${id}`);
}
