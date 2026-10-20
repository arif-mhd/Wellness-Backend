import Anthropic from "@anthropic-ai/sdk";

// ── Claude (Anthropic) for the wellness AI features ──────────────────────────
// Chat, food-photo analysis, voice exercise parsing and the pre-visit summary
// all go through generateJson(). Haiku answers first (fast, cheapest); Sonnet
// is the backup when Haiku errors, declines, or runs out of tokens. Every call
// uses structured outputs, so a successful response is always JSON matching
// the schema — no fence-stripping or "find the {...}" recovery needed.
//
// The key is ANTHROPIC_API_KEY (Secret Manager → Cloud Run env), read by the
// SDK itself. Haiku 5.5 / Sonnet 5.5 reject non-default temperature, so the
// routes steer tone and format from their prompts and schemas instead.
export const CLAUDE_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"] as const;

export type ClaudeEffort = "low" | "medium" | "high";

/** Every model declined the request on safety grounds (stop_reason "refusal"). */
export class ClaudeDeclinedError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // One retry inside the SDK for 429/5xx/network, then the next model —
  // a patient is waiting on the other end, so don't stack long retry chains.
  client ??= new Anthropic({ maxRetries: 1, timeout: 30_000 });
  return client;
}

export function isClaudeConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY ?? "").trim();
}

function describe(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `${err.status ?? "network"} ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

export async function generateJson<T = any>({
  label,
  system,
  messages,
  schema,
  maxTokens,
  effort = "low",
}: {
  /** Log prefix, e.g. "wellness-chat". */
  label: string;
  system: string;
  messages: Anthropic.MessageParam[];
  /** JSON Schema: every object needs additionalProperties: false. */
  schema: Record<string, unknown>;
  /** Includes room for the model's thinking, not just the JSON. */
  maxTokens: number;
  effort?: ClaudeEffort;
}): Promise<{ data: T; model: string }> {
  let lastError: unknown = null;
  let declined = 0;

  for (const model of CLAUDE_MODELS) {
    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages,
        output_config: { effort, format: { type: "json_schema", schema } },
      });

      if (response.stop_reason === "refusal") {
        declined++;
        throw new Error(`declined (${response.stop_details?.category ?? "no category"})`);
      }
      if (response.stop_reason === "max_tokens") throw new Error("ran out of output tokens");

      // A response can open with thinking blocks — read the text by type.
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      if (!text.trim()) throw new Error("empty response");

      console.log(`[${label}] ✓ model=${model}`);
      return { data: JSON.parse(text) as T, model };
    } catch (err) {
      console.warn(`[${label}] ${model} failed:`, describe(err));
      lastError = err;
      // A bad or missing key fails the same way on every model.
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) break;
    }
  }

  if (declined === CLAUDE_MODELS.length) {
    throw new ClaudeDeclinedError(`All models declined: ${describe(lastError)}`);
  }
  throw new Error(`All models failed: ${describe(lastError)}`);
}
