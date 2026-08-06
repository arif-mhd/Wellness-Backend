// LiveKit credentials used to mint room-join tokens for video calls and
// in-app chat (appointments.ts, messages.ts). Deliberately has no dev-secret
// fallback — a well-known credential baked into source would let anyone who
// has read this repo forge a valid token and join/eavesdrop on any patient
// consultation or chat. Failing loudly at startup if these aren't set is far
// safer than silently degrading to a public secret.
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error(
    "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set — video calls and chat cannot function without them."
  );
}

export const livekitApiKey: string = apiKey;
export const livekitApiSecret: string = apiSecret;
