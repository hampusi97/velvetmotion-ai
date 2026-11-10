export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function parseChatHistory(raw: string | null): ChatMessage[] {
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (!Array.isArray(data)) return [];
    return data.filter((message): message is ChatMessage =>
      message && typeof message === "object" &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" && message.content.length <= 20_000,
    ).slice(-100).map(({ role, content }) => ({ role, content }));
  } catch { return []; }
}
