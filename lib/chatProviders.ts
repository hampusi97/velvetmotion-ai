import { fetchWithRetry } from "./netRetry";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

/** Keyless default. OpenAI-compatible shape, so the same call also drives custom endpoints. */
export async function freeChat(
  messages: ChatMessage[],
  opts: { signal?: AbortSignal; model?: string } = {},
): Promise<string> {
  const res = await fetchWithRetry(
    "https://text.pollinations.ai/openai",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model || "openai",
        messages,
        referrer: "velvetmotion",
      }),
    },
    { label: "Free chat", timeoutMs: 60_000, attempts: 3, signal: opts.signal },
  );

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: string;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(data.error || "Empty reply from free chat");
  return text;
}
