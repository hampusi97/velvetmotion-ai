type StreamEvent = {
  error?: { message?: string };
  choices?: Array<{ delta?: { content?: string }; text?: string; finish_reason?: string | null }>;
};

/** Hold back a trailing partial tag and any incomplete reasoning block. */
export function visibleChatPreview(text: string): string {
  return text
    .replace(/<(?:think|reasoning)>[\s\S]*?(?:<\/(?:think|reasoning)>|$)/gi, "")
    .replace(/<[^>]*$/, "");
}

/** Collect a complete OpenAI-compatible response while emitting provisional text. */
export async function readChatEventStream(
  body: ReadableStream<Uint8Array>,
  onProgress?: (text: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const dataLines: string[] = [];
  let pending = "";
  let text = "";
  let finished = false;

  function readLine(line: string) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
      return;
    }
    if (line || !dataLines.length) return;

    const data = dataLines.splice(0).join("\n");
    if (data === "[DONE]") {
      finished = true;
      return;
    }

    let event: StreamEvent;
    try {
      event = JSON.parse(data) as StreamEvent;
    } catch {
      return;
    }
    if (event.error) throw new Error("The chat provider interrupted the stream.");
    const choice = event.choices?.[0];
    const delta = choice?.delta?.content ?? choice?.text;
    if (typeof delta === "string" && delta) {
      text += delta;
      onProgress?.(visibleChatPreview(text));
    }
    if (choice?.finish_reason) finished = true;
  }

  try {
    while (!finished) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        readLine(line.replace(/\r$/, ""));
        if (finished) break;
      }
    }
    if (!finished) {
      readLine((pending + decoder.decode()).replace(/\r$/, ""));
      readLine("");
    }
    if (!finished) throw new Error("The chat stream ended before the provider completed the reply.");
    return text;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
