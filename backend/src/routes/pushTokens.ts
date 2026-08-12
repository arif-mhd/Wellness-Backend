import { Router, Response } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { pushTokensContainer } from "../config/cosmos";

const router = Router();

// POST /api/push-tokens
// Registers (or refreshes) this device's Expo push token for the current
// user. Idempotent — safe to call every time the app opens.
router.post("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required." });
    return;
  }

  try {
    const { resource } = await pushTokensContainer
      .item(userId, userId)
      .read()
      .catch(() => ({ resource: undefined as any }));
    const tokens: string[] = resource?.tokens ?? [];
    if (!tokens.includes(token)) {
      tokens.push(token);
    }
    await pushTokensContainer.items.upsert({
      id: userId,
      userId,
      tokens,
      updatedAt: new Date().toISOString(),
    });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Register push token error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// DELETE /api/push-tokens
// Unregisters this device's token, e.g. on sign-out, so a signed-out device
// stops receiving another account's notifications.
router.delete("/", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required." });
    return;
  }

  try {
    const { resource } = await pushTokensContainer
      .item(userId, userId)
      .read()
      .catch(() => ({ resource: undefined as any }));
    if (!resource) {
      res.json({ status: "OK" });
      return;
    }
    const tokens: string[] = (resource.tokens ?? []).filter((t: string) => t !== token);
    await pushTokensContainer.items.upsert({ ...resource, tokens, updatedAt: new Date().toISOString() });
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Unregister push token error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
