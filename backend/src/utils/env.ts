// Shared fallback for non-secret config env vars (URLs/domains, not API keys —
// see config/livekit.ts's unconditional throw for why secrets get no fallback
// at all). In production, a missing value here would otherwise silently point
// real clients at a nonexistent local server; in dev, defaulting keeps the
// app runnable without a full .env file. Callers pass this as the last `||`
// operand in their existing fallback chain, so it's only evaluated — and only
// throws — if every higher-priority env var in that chain was left unset.
export function devFallbackOrThrow(envVarName: string, fallback: string): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${envVarName} must be set in production.`);
  }
  console.warn(`[env] ${envVarName} not set — using local dev fallback: ${fallback}`);
  return fallback;
}
