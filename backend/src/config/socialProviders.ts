/**
 * Google and Apple sign-in provider configuration.
 *
 * White-labelling makes this more involved than a single client id. Each brand
 * ships under its own bundle identifier (com.arifmhd.wellnessapp,
 * com.anandalakshmi.wellness, …), and Google and Apple issue credentials per
 * bundle id — so every brand needs its own client on every platform. That is
 * modelled with SuperTokens' `clientType`, which lets one provider hold many
 * clients; the app sends the matching clientType with its sign-in request.
 *
 * clientType convention:  <brand>-<platform>   e.g. "wellness-ios",
 * "anandalakshmi-android". Brands are read from SOCIAL_AUTH_BRANDS so adding a
 * brand is an env change, not a code change.
 *
 * A provider is only registered when at least one client is fully configured.
 * A deployment with no credentials simply has no social sign-in rather than
 * failing to boot, which keeps local dev and the existing production
 * deployment working untouched until the consoles are set up.
 *
 * Expected env vars, per brand (BRAND upper-cased, dashes to underscores):
 *   GOOGLE_CLIENT_ID_<BRAND>_IOS
 *   GOOGLE_CLIENT_ID_<BRAND>_ANDROID
 *   GOOGLE_CLIENT_ID_<BRAND>_WEB   + GOOGLE_CLIENT_SECRET_<BRAND>_WEB
 *   APPLE_CLIENT_ID_<BRAND>        (the iOS bundle id)
 * and, shared across brands on the same Apple team:
 *   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY   (the .p8 contents)
 *
 * Apple is iOS-only by design: App Store Guideline 4.8 requires Sign in with
 * Apple on iOS when other social providers are offered, but says nothing about
 * Android, where it would need a clunkier web-redirect flow through a Service
 * ID. Android shows Google alone.
 */

import type { ProviderInput } from "supertokens-node/recipe/thirdparty/types";

// Lower-cased so clientType is stable regardless of how the env var or a
// brand.json slug is capitalised. The app normalises the same way; a mismatch
// here fails a sign-in with an unhelpful "no client for clientType" rather
// than anything pointing at casing.
const brands = (process.env.SOCIAL_AUTH_BRANDS ?? "wellness")
  .split(",")
  .map((b) => b.trim().toLowerCase())
  .filter(Boolean);

const envKey = (brand: string) => brand.toUpperCase().replace(/-/g, "_");

const env = (name: string): string | undefined => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
};

function googleProvider(): ProviderInput | null {
  const clients: NonNullable<ProviderInput["config"]["clients"]> = [];

  for (const brand of brands) {
    const B = envKey(brand);

    const ios = env(`GOOGLE_CLIENT_ID_${B}_IOS`);
    if (ios) clients.push({ clientType: `${brand}-ios`, clientId: ios });

    const android = env(`GOOGLE_CLIENT_ID_${B}_ANDROID`);
    if (android) clients.push({ clientType: `${brand}-android`, clientId: android });

    // Only the web client carries a secret; native clients are public by
    // design and Google rejects a secret on them.
    const web = env(`GOOGLE_CLIENT_ID_${B}_WEB`);
    const webSecret = env(`GOOGLE_CLIENT_SECRET_${B}_WEB`);
    if (web) clients.push({ clientType: `${brand}-web`, clientId: web, clientSecret: webSecret });
  }

  if (clients.length === 0) return null;
  return { config: { thirdPartyId: "google", clients } };
}

function appleProvider(): ProviderInput | null {
  const teamId = env("APPLE_TEAM_ID");
  const keyId = env("APPLE_KEY_ID");
  // Stored with literal \n escapes in most secret managers.
  const privateKey = env("APPLE_PRIVATE_KEY")?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) return null;

  const clients: NonNullable<ProviderInput["config"]["clients"]> = [];
  for (const brand of brands) {
    const clientId = env(`APPLE_CLIENT_ID_${envKey(brand)}`);
    if (clientId) {
      clients.push({
        clientType: `${brand}-ios`,
        clientId,
        additionalConfig: { teamId, keyId, privateKey },
      });
    }
  }

  if (clients.length === 0) return null;
  return { config: { thirdPartyId: "apple", clients } };
}

export function socialProviders(): ProviderInput[] {
  const providers = [googleProvider(), appleProvider()].filter(
    (p): p is ProviderInput => p !== null
  );

  if (providers.length === 0) {
    console.warn(
      "[socialProviders] No Google/Apple credentials configured — social sign-in is disabled. " +
        "This is expected until the OAuth consoles are set up."
    );
  } else {
    console.log(
      `[socialProviders] enabled: ${providers
        .map((p) => `${p.config.thirdPartyId} (${p.config.clients?.length ?? 0} clients)`)
        .join(", ")}`
    );
  }

  return providers;
}
