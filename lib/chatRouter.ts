/**
 * Zero-server chat router. Static-export safe.
 * Priority: custom OpenAI-compatible → OpenRouter → AI Horde text.
 */
export interface RouterMessage { role: "user" | "assistant"; text: string; }
export interface CompanionPersona { id: string; name: string; age: number; tagline: string; personality?: string; }
export interface ChatRouterSettings {
  provider: "auto" | "openrouter" | "ai-horde" | "custom";
  openRouterApiKey?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  aiHordeApiKey?: string;
}

const KEY = "velvetmotion_llm_settings";

export function loadRouterSettings(): ChatRouterSettings {
  if (typeof window === "undefined") return { provider: "auto" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { provider: "auto", ...JSON.parse(raw) };
  } catch {}
  return { provider: "auto", aiHordeApiKey: "0000000000" };
}

export function saveRouterSettings(next: Partial<ChatRouterSettings>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadRouterSettings(), ...next })); } catch {}
}

function systemPrompt(p: CompanionPersona): string {
  return `You are ${p.name}, a ${p.age}-year-old fictional adult companion. Bio: ${p.tagline}. ${p.personality || ""} Stay in character. Flirty, short replies. Never break character or mention being an AI.`;
}

async function callHorde(persona: CompanionPersona, history: RouterMessage[]): Promise<string> {
  const transcript = history.slice(-10).map(m => `${m.role === "user" ? "User" : persona.name}: ${m.text}`).join("\n");
  const prompt = `${systemPrompt(persona)}\n\n${transcript}\n${persona.name}:`;
  const res = await fetch("https://aihorde.net/api/v2/generate/text/async", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: "0000000000", "Client-Agent": "VelvetMotionAI:1.0:web" },
    body: JSON.stringify({ prompt, params: { max_length: 160, temperature: 0.85, stop_sequence: ["\nUser:", `\n${persona.name}:`] } }),
  });
  if (!res.ok) throw new Error("horde submit");
  const { id } = await res.json();
  if (!id) throw new Error("no id");
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const s = await fetch(`https://aihorde.net/api/v2/generate/text/status/${id}`);
    if (!s.ok) continue;
    const st = await s.json();
    if (st.done) {
      const text = (st.generations?.[0]?.text || "").split(/\nUser:/i)[0].trim();
      if (text) return text;
    }
    if (st.faulted) break;
  }
  throw new Error("horde timeout");
}

export async function generateCompanionReply(history: RouterMessage[], persona: CompanionPersona): Promise<{ text: string; providerUsed: string }> {
  const settings = loadRouterSettings();
  if (settings.customBaseUrl) {
    try {
      const res = await fetch(`${settings.customBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(settings.customApiKey ? { Authorization: `Bearer ${settings.customApiKey}` } : {}) },
        body: JSON.stringify({ model: "local", messages: [{ role: "system", content: systemPrompt(persona) }, ...history.slice(-12).map(m => ({ role: m.role, content: m.text }))], max_tokens: 200 }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return { text, providerUsed: "custom" };
      }
    } catch {}
  }
  try {
    const text = await callHorde(persona, history);
    return { text, providerUsed: "ai-horde" };
  } catch {
    return { text: `${persona.name.split(" ")[0]} smiles. “Say that again — I want to hear it.”`, providerUsed: "fallback" };
  }
}
