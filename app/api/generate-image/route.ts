import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";

const STYLES: Record<string, string> = {
  portrait:
    "tasteful beauty portrait, soft cinematic lighting, sharp eyes, detailed skin texture, looking at viewer, magazine quality, seductive",
  lingerie:
    "wearing luxurious sheer lingerie, bedroom ambient light, seductive pose, photorealistic, detailed lace fabric, intimate atmosphere, cleavage, arched back",
  nude:
    "fully nude, completely naked, bare breasts, visible nipples, detailed skin pores, erotic photography, uncensored nsfw, soft cinematic lighting, highly detailed anatomy, looking at camera, aroused expression, photorealistic",
  explicit:
    "explicit nude, sexual pose, detailed genitals, wet skin, uncensored nsfw, photorealistic, studio quality lighting, sharp focus, aroused expression, legs spread or arched back",
  sex:
    "explicit heterosexual sex scene, penetration, intimate couple on bed, sweaty glistening skin, uncensored nsfw, photorealistic, passionate motion, cinematic lighting, detailed anatomy, intense eye contact",
  doggy:
    "explicit sex from behind, doggy style, arched back, uncensored nsfw, photorealistic, bedroom or hotel",
  cowgirl:
    "woman on top cowgirl position, explicit, uncensored nsfw, photorealistic, intimate eye contact, riding",
  blowjob:
    "explicit oral sex, blowjob, looking up at camera, uncensored nsfw, photorealistic, wet lips, detailed",
  missionary:
    "explicit missionary sex, legs spread, eye contact, uncensored nsfw, photorealistic, passionate",
  standing:
    "explicit standing sex against wall or shower, uncensored nsfw, photorealistic, wet skin",
  hotel:
    "explicit sex in luxury hotel room, soft lighting, uncensored nsfw, photorealistic, cinematic",
  car:
    "explicit sex in car, risky, uncensored nsfw, photorealistic, night",
  outdoor:
    "explicit outdoor sex, private, uncensored nsfw, photorealistic, natural light",
  joi:
    "JOI style, she talks dirty while you stroke, looking at camera, uncensored nsfw, photorealistic",
  sph:
    "SPH energy, she laughs and rates, looking down, uncensored nsfw, photorealistic",
  bnwo:
    "BNWO fantasy, ranking, ownership, uncensored nsfw, photorealistic",
  breeding:
    "breeding creampie, filled, moaning, uncensored nsfw, photorealistic, intense",
  "reverse-cowgirl":
    "reverse cowgirl, woman facing away, explicit, uncensored nsfw, photorealistic",
  spooning:
    "spooning sex, side by side, intimate, uncensored nsfw, photorealistic",
  "against-wall":
    "sex against wall, standing, legs up, uncensored nsfw, photorealistic",
  shower:
    "shower sex, wet skin, steam, uncensored nsfw, photorealistic",
  video:
    "cinematic still from adult film, explicit sex scene, dramatic rim light, shallow depth of field, film grain, 35mm, intense, uncensored",
};

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 800000000) + 100000;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const type = typeof body.type === "string" ? body.type : "portrait";
    const pose = typeof body.pose === "string" ? body.pose : "looking at viewer, seductive";
    const extra = typeof body.extra === "string" ? body.extra : "";
    const character = getCharacter(characterId);

    const look = character?.figure || "beautiful adult woman, proportionate figure";
    const name = character?.name || "companion";
    const style = STYLES[type] || STYLES.portrait;

    const prompt = [
      "masterpiece, best quality, ultra detailed, photorealistic",
      `beautiful adult woman 25 years old, ${look}`,
      `${name} aesthetic, consistent face and body`,
      style,
      pose,
      extra,
      "realistic skin pores, natural proportions, 8k uhd",
    ]
      .filter(Boolean)
      .join(", ");

    const custom = (process.env.AI_IMAGE_ENDPOINT || "").trim();
    const customKey = (process.env.AI_IMAGE_API_KEY || "").trim();
    if (custom) {
      try {
        const res = await fetch(custom, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(customKey ? { Authorization: `Bearer ${customKey}` } : {}),
          },
          body: JSON.stringify({ prompt, width: 768, height: 1152 }),
        });
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("json")) {
            const data = await res.json();
            const url = data.url || data.image || data.output?.[0];
            if (url) {
              return NextResponse.json({ success: true, url, prompt, source: "custom" });
            }
          }
        }
      } catch {
        /* fall through */
      }
    }

    // Character-biased seed + small jitter so she stays recognizable across gens
    const seed = seedFromId(characterId || name) + Math.floor(Math.random() * 40);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;

    return NextResponse.json({
      success: true,
      url,
      prompt,
      source: "pollinations",
      type,
      characterId: character?.id || characterId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
