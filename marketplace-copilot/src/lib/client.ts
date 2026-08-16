/**
 * The Anthropic call. Lives in the service worker only — the API key never
 * enters the page context, where Facebook's own scripts could read it.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AppraisalSchema, type AppraisalOutput, SYSTEM_PROMPT, buildListingPrompt } from "./prompt.ts";
import type { Effort, Listing } from "./types.ts";
import { DEFAULT_MODEL } from "./models.ts";

/** Anthropic accepts these; anything else the CDN hands us gets dropped. */
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface AppraiseResult {
  appraisal: AppraisalOutput;
  meta: {
    model: string;
    servedBy: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    imagesAnalyzed: number;
    searches: number;
  };
}

export class AppraisalError extends Error {
  constructor(
    message: string,
    readonly kind: "no_api_key" | "refusal" | "rate_limit" | "network" | "parse",
  ) {
    super(message);
    this.name = "AppraisalError";
  }
}

export interface AppraiseOptions {
  apiKey: string;
  model?: string;
  /** `low` and `medium` are unusually strong on Opus 5 and much faster. */
  effort?: Effort;
  images?: Array<{ mediaType: ImageMediaType; base64: string }>;
  /**
   * Let the model search the web for current sold prices instead of pricing
   * from training-time memory. Slower and costs per search, but it's the
   * difference between a real comp and a recollection.
   */
  liveComps?: boolean;
}

/** Server-side tool turns can pause; this bounds how many times we resume. */
const MAX_CONTINUATIONS = 4;

export async function appraise(
  listing: Listing,
  opts: AppraiseOptions,
): Promise<AppraiseResult> {
  if (!opts.apiKey) {
    throw new AppraisalError("No API key set. Open the extension options to add one.", "no_api_key");
  }

  const client = new Anthropic({
    apiKey: opts.apiKey,
    // The key lives in extension storage and requests go out from the service
    // worker, not from facebook.com. See README for the threat model.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });

  const model = opts.model ?? DEFAULT_MODEL;
  const images = opts.images ?? [];

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...images.map(
      (img): Anthropic.Beta.BetaContentBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      }),
    ),
    { type: "text", text: buildListingPrompt(listing) },
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content }];

  const request = {
    model,
    max_tokens: 16000,
    // Thinking is on by default on Opus 5; stated explicitly so the intent
    // survives a future model swap. max_tokens caps thinking + output together.
    thinking: { type: "adaptive" as const },
    output_config: {
      effort: opts.effort ?? "medium",
      // zodOutputFormat strips the JSON Schema constructs the API doesn't
      // accept and validates them client-side instead. The cast is because
      // the helper is typed against the non-beta output_config.
      format: zodOutputFormat(AppraisalSchema) as never,
    },
    // Opus 5's safety classifiers can decline a request. Rather than surfacing
    // that to the user, let the API re-serve it on the recommended fallback.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    ...(opts.liveComps
      ? { tools: [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 5 }] }
      : {}),
    system: [
      {
        type: "text" as const,
        text: SYSTEM_PROMPT,
        // The system prompt is byte-identical every call, so it caches.
        cache_control: { type: "ephemeral" as const },
      },
    ],
  };

  let response: Anthropic.Beta.BetaMessage;
  let searches = 0;
  try {
    // Web search runs server-side and can exhaust its per-turn iteration budget,
    // coming back as `pause_turn`. Re-sending the assistant turn resumes it.
    for (let attempt = 0; ; attempt++) {
      response = await client.beta.messages.create({ ...request, messages });
      searches += countSearches(response);

      if (response.stop_reason !== "pause_turn" || attempt >= MAX_CONTINUATIONS) break;
      messages.push({ role: "assistant", content: response.content });
    }
  } catch (err) {
    throw toAppraisalError(err);
  }

  if (response.stop_reason === "refusal") {
    throw new AppraisalError(
      "The model declined to analyze this listing. If it's an ordinary item, this is likely a false positive — try again.",
      "refusal",
    );
  }

  // With server tools in play the response interleaves search results and
  // commentary; the structured JSON is always the final text block.
  const text = response.content.findLast((b) => b.type === "text")?.text;
  if (!text) {
    throw new AppraisalError(
      response.stop_reason === "max_tokens"
        ? "Ran out of output budget before finishing. Lower the effort setting and retry."
        : "The model returned no text to parse.",
      "parse",
    );
  }

  const parsed = AppraisalSchema.safeParse(safeJson(text));
  if (!parsed.success) {
    throw new AppraisalError(
      `Response didn't match the expected shape: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
      "parse",
    );
  }

  return {
    appraisal: parsed.data,
    meta: {
      model,
      servedBy: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      imagesAnalyzed: images.length,
      searches,
    },
  };
}

function countSearches(response: Anthropic.Beta.BetaMessage): number {
  return response.content.filter(
    (b) => b.type === "server_tool_use" && b.name === "web_search",
  ).length;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new AppraisalError("The model's response wasn't valid JSON.", "parse");
  }
}

function toAppraisalError(err: unknown): AppraisalError {
  if (err instanceof Anthropic.AuthenticationError) {
    return new AppraisalError("API key rejected. Check it in the extension options.", "no_api_key");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AppraisalError("Rate limited by the API. Wait a moment and retry.", "rate_limit");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AppraisalError("Couldn't reach the Anthropic API. Check your connection.", "network");
  }
  if (err instanceof Anthropic.APIError) {
    return new AppraisalError(`API error ${err.status}: ${err.message}`, "network");
  }
  return new AppraisalError(err instanceof Error ? err.message : String(err), "network");
}
