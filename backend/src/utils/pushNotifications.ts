import { pushTokensContainer } from "../config/cosmos";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
}

/**
 * Sends a push notification to every device a user has registered.
 *
 * No-ops silently — by design, not as an error case — whenever the user has
 * no registered tokens. That covers doctors/admins (they use web portals,
 * which never call the register endpoint) and patients who haven't granted
 * notification permission yet, without needing a separate feature flag.
 * Push delivery is always best-effort: a failure here must never fail the
 * caller's actual request, so every error is caught and logged, never thrown.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { resource } = await pushTokensContainer
      .item(userId, userId)
      .read()
      .catch((err: any) => {
        if (err.code === 404) return { resource: undefined };
        throw err;
      });
    const tokens: string[] = resource?.tokens ?? [];
    if (tokens.length === 0) return true;

    const messages: ExpoPushMessage[] = tokens.map((to) => ({ to, title, body, data, sound: "default" }));
    const deadTokens: string[] = [];
    let accepted = true;

    for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
      const chunk = messages.slice(i, i + EXPO_BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) { accepted = false; continue; }
      const json: any = await res.json().catch(() => null);
      const tickets: any[] = json?.data ?? [];
      if (!Array.isArray(tickets) || tickets.length !== chunk.length) { accepted = false; continue; }
      tickets.forEach((ticket, idx) => {
        if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
          deadTokens.push(chunk[idx].to);
        } else if (ticket?.status !== "ok") {
          accepted = false;
        }
      });
    }

    // Prune tokens Expo says are permanently dead so we stop retrying them.
    if (deadTokens.length > 0) {
      const survivors = tokens.filter((t) => !deadTokens.includes(t));
      await pushTokensContainer.items.upsert({
        id: userId,
        userId,
        tokens: survivors,
        updatedAt: new Date().toISOString(),
      });
    }
    return accepted;
  } catch (err) {
    console.warn("[push] Failed to send push notification:", err);
    return false;
  }
}
