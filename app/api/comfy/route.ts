import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_NEG =
  "low quality, blurry, deformed, extra fingers, watermark, text, logo, underage, child";

export interface ComfyWorkflowOptions {
  prompt: string;
  negativePrompt?: string;
  seed: number;
  width?: number;
  height?: number;
  checkpoint?: string;
  referenceImageBase64?: string;
  ipAdapterWeight?: number;
}

/**
 * Build a ComfyUI txt2img workflow graph, optionally wiring an IP-Adapter
 * face-lock reference node when a reference image is provided.
 */
export function buildComfyWorkflowGraph(opts: ComfyWorkflowOptions): Record<string, unknown> {
  const width = opts.width || 768;
  const height = opts.height || 1152;
  const checkpoint = opts.checkpoint || process.env.COMFY_CHECKPOINT || "flux1-dev-fp8.safetensors";
  const hasRef = Boolean(opts.referenceImageBase64 && opts.referenceImageBase64.length > 32);

  const graph: Record<string, unknown> = {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: 5.5,
        denoise: 1.0,
        latent_image: ["5", 0],
        model: [hasRef ? "11" : "4", 0],
        negative: ["7", 0],
        positive: ["6", 0],
        sampler_name: "euler",
        scheduler: "normal",
        seed: opts.seed,
        steps: 22,
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { batch_size: 1, height, width },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: opts.prompt },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: opts.negativePrompt || DEFAULT_NEG },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "VelvetMotion", images: ["8", 0] },
    },
  };

  if (hasRef) {
    graph["10"] = {
      class_type: "ETN_LoadImageBase64",
      inputs: {
        image: opts.referenceImageBase64!.replace(/^data:[^;]+;base64,/, ""),
      },
    };
    graph["11"] = {
      class_type: "IPAdapterUnifiedLoaderFaceID",
      inputs: {
        model: ["4", 0],
        preset: "FACEID PLUS V2",
        lora_strength: 0.65,
        provider: "CUDA",
        image: ["10", 0],
        weight: opts.ipAdapterWeight ?? 0.85,
      },
    };
  }

  return graph;
}

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
