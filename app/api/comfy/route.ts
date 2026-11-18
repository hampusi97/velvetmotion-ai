import { NextResponse } from "next/server";
import { buildComfyWorkflowGraph } from "@/lib/comfyClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_NEG =
  "low quality, blurry, deformed, extra fingers, watermark, text, logo, underage, child";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const base = String(body.baseUrl || process.env.COMFY_URL || "http://127.0.0.1:8188")
      .trim()
      .replace(/\/$/, "");
    const mode = body.mode === "forge" ? "forge" : "comfy";
    const prompt = String(body.prompt || "beautiful adult woman portrait");
    const negativePrompt = String(body.negative || DEFAULT_NEG);
    const seed = Number(body.seed) || Math.floor(Math.random() * 1000000);
    const width = Number(body.width) || 768;
    const height = Number(body.height) || 1152;
    const referenceImageBase64 =
      typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : undefined;

    if (mode === "forge") {
      const res = await fetch(`${base}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          seed,
          width,
          height,
          steps: 20,
          cfg_scale: 5,
        }),
        signal: AbortSignal.timeout(50000),
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, note: `Forge HTTP ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      const b64 = data.images?.[0];
      if (!b64) {
        return NextResponse.json({ ok: false, note: "No image in Forge response" }, { status: 502 });
      }
      return NextResponse.json({
        ok: true,
        imageUrl: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
        note: "Local Forge/A1111 via /api/comfy",
      });
    }

    const workflow = buildComfyWorkflowGraph({
      prompt,
      negativePrompt,
      seed,
      width,
      height,
      checkpoint: process.env.COMFY_CHECKPOINT || "flux1-dev-fp8.safetensors",
      referenceImageBase64,
    });

    const queueRes = await fetch(`${base}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(15000),
    });

    if (!queueRes.ok) {
      return NextResponse.json(
        { ok: false, note: `ComfyUI queue HTTP ${queueRes.status}`, workflow },
        { status: 502 },
      );
    }

    const queued = await queueRes.json();
    const promptId = queued.prompt_id;
    if (!promptId) {
      return NextResponse.json({ ok: false, note: "No prompt_id from ComfyUI" }, { status: 502 });
    }

    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1000));
      const histRes = await fetch(`${base}/history/${promptId}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!histRes.ok) continue;
      const hist = await histRes.json();
      const item = hist?.[promptId];
      if (!item?.outputs) continue;
      for (const nodeOut of Object.values(item.outputs) as Array<{
        images?: Array<{ filename: string; subfolder?: string; type?: string }>;
      }>) {
        const img = nodeOut.images?.[0];
        if (img?.filename) {
          const params = new URLSearchParams({
            filename: img.filename,
            subfolder: img.subfolder || "",
            type: img.type || "output",
          });
          const viewRes = await fetch(`${base}/view?${params.toString()}`, {
            signal: AbortSignal.timeout(15000),
          });
          if (viewRes.ok) {
            const buf = Buffer.from(await viewRes.arrayBuffer());
            return NextResponse.json({
              ok: true,
              imageUrl: `data:image/png;base64,${buf.toString("base64")}`,
              note: referenceImageBase64
                ? "ComfyUI + IP-Adapter FaceID lock"
                : "ComfyUI local workflow",
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: false, note: "ComfyUI generation timed out" }, { status: 504 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, note: e instanceof Error ? e.message : "Comfy proxy error" },
      { status: 502 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "comfy-forge-ipadapter-bridge",
    supports: ["comfyui-ksampler", "ip-adapter-faceid-v2", "forge-a1111-txt2img"],
  });
}
