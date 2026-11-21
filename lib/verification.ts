import { freeChat, type ChatMessage } from "./chatProviders";
import type { CompanionProfile } from "@/data/companions";

export interface Verdict {
  pass: boolean | null;
  line: string;
}

export async function verifyPhoto(
  companion: Pick<CompanionProfile, "name" | "personality">,
  photoDataUrl: string,
  claim: string,
  chatFn: (messages: ChatMessage[]) => Promise<string> = freeChat,
): Promise<Verdict> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are ${companion.name}. ${companion.personality} The user has sent a photo as proof of "${claim}". Judge whether the photo plausibly supports the claim. Reply with exactly two lines: first "PASS" or "FAIL", second a one-sentence in-character verdict. No other text.`,
    },
    {
      role: "user",
      content: [
        { type: "text", text: claim },
        { type: "image_url", image_url: { url: photoDataUrl } },
      ],
    },
  ];

  try {
    const raw = await chatFn(messages);
    const [first, ...rest] = raw.trim().split("\n");
    const verdict = /pass/i.test(first) ? true : /fail/i.test(first) ? false : null;
    return { pass: verdict, line: rest.join(" ").trim() || raw.trim() };
  } catch {
    return { pass: null, line: "I can't see it properly. Tell me instead." };
  }
}
