/**
 * Real ComfyUI image-to-video adapter.
 * Requires a user-provided ComfyUI "Save (API Format)" workflow with
 * compatible installed video model nodes and a video save/output node.
 * No model weights or untrusted executable custom nodes are installed here.
 */
export interface ComfyVideoConfig {
  baseUrl: string;
  workflowJson: string;
  imageNodeId: string;
  promptNodeId?: string;
}
export interface ComfyVideoRequest extends ComfyVideoConfig {
  sourceImageUrl: string;
  prompt: string;
  onStatus?: (stage: string) => void;
}
type WorkflowNode = { class_type: string; inputs: Record<string, unknown> };
type Workflow = Record<string, WorkflowNode>;
type MediaFile = { filename?: string; subfolder?: string; type?: string };
type VideoHistory = Record<string, {
  status?: { status_str?: string };
  outputs?: Record<string, { gifs?: MediaFile[]; videos?: MediaFile[]; images?: MediaFile[] }>;
}>;

export function prepareComfyVideoWorkflow(json: string, imageNodeId: string, imageFile: string, promptNodeId: string | undefined, prompt: string): Workflow {
  if (!json || json.length > 250_000) throw new Error("ComfyUI API workflow must be under 250 KB.");
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Workflow is not valid JSON."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected ComfyUI API-format node map.");
  const nodes = raw as Record<string, unknown>;
  if (Array.isArray(nodes.nodes)) throw new Error("ComfyUI canvas workflow detected. Export in API format instead.");
  if (Object.keys(nodes).length === 0 || Object.keys(nodes).length > 250) throw new Error("Workflow must contain 1–250 nodes.");
  const graph: Workflow = Object.create(null);
  for (const [id, node] of Object.entries(nodes)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !node || typeof node !== "object" || Array.isArray(node)) {
      throw new Error("Unexpected workflow node.");
    }
    const value = node as { class_type?: unknown; inputs?: unknown };
    if (typeof value.class_type !== "string" || !value.inputs || typeof value.inputs !== "object" || Array.isArray(value.inputs)) {
      throw new Error("Workflow must use ComfyUI API format, not the visual canvas export.");
    }
    graph[id] = { ...(node as WorkflowNode), inputs: { ...(value.inputs as Record<string, unknown>) } };
  }
  const imageNode = graph[imageNodeId];
  if (!imageNode || imageNode.class_type !== "LoadImage") {
    throw new Error("Select a valid LoadImage node ID in the video workflow.");
  }
  if (!imageFile || imageFile.includes("/") || imageFile.includes("\\") || imageFile.length > 200) {
    throw new Error("ComfyUI returned an unsafe source-image filename.");
  }
  imageNode.inputs.image = imageFile;
  if (promptNodeId) {
    const promptNode = graph[promptNodeId];
    if (!promptNode || promptNode.class_type !== "CLIPTextEncode") {
      throw new Error("Prompt node ID must reference CLIPTextEncode, or be left empty.");
    }
    promptNode.inputs.text = prompt;
  }
  return graph;
}

export function findComfyVideoOutput(history: VideoHistory, promptId: string, baseUrl: string): string | null {
  const outputs = history[promptId]?.outputs;
  if (!outputs) return null;
  for (const output of Object.values(outputs)) {
    for (const field of ["videos", "gifs", "images"] as const) {
      const files = output?.[field];
      if (!Array.isArray(files)) continue;
      for (const file of files) {
        if (!file || typeof file.filename !== "string" || !/\.(?:mp4|webm)$/i.test(file.filename)) continue;
        if (!["output", "temp"].includes(file.type || "output")) continue;
        const base = new URL(baseUrl);
        const params = new URLSearchParams({
          filename: file.filename, subfolder: file.subfolder || "", type: file.type || "output",
        });
        return new URL(`/view?${params.toString()}`, base).toString();
      }
    }
  }
  return null;
}

export function validateComfyVideoBase(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new Error("ComfyUI video URL must be an HTTP(S) server root, without credentials or path.");
  }
  return url.origin;
}

export async function generateComfyVideo(req: ComfyVideoRequest): Promise<{videoUrl:string; videoFormat:"mp4"|"webm"}> {
  const base = validateComfyVideoBase(req.baseUrl);
  // Validate the entire workflow before uploading the user's source photo.
  prepareComfyVideoWorkflow(req.workflowJson, req.imageNodeId, "validation.png", req.promptNodeId, req.prompt);
  req.onStatus?.("Preparing original source image");
  const source = await fetch(req.sourceImageUrl, {signal:AbortSignal.timeout(20000)});
  if (!source.ok) throw new Error(`Unable to load source image (HTTP ${source.status}).`);
  const blob = await source.blob();
  if (!/^image\/(?:png|jpeg|webp)$/i.test(blob.type) || blob.size > 12 * 1024 * 1024 || blob.size === 0) {
    throw new Error("ComfyUI video source must be a PNG, JPEG or WebP image under 12 MB.");
  }
  const form = new FormData();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  form.append("image", blob, `velvetmotion-video-input.${ext}`);
  form.append("type", "input");
  form.append("overwrite", "true");
  req.onStatus?.("Uploading to your ComfyUI server");
  const uploaded = await fetch(`${base}/upload/image`, { method:"POST", body:form, signal:AbortSignal.timeout(45000) });
  if (!uploaded.ok) throw new Error(`ComfyUI image upload failed (HTTP ${uploaded.status}).`);
  const uploadData = (await uploaded.json()) as {name?:unknown};
  if (typeof uploadData.name !== "string") throw new Error("ComfyUI returned no uploaded image filename.");
  const workflow = prepareComfyVideoWorkflow(req.workflowJson, req.imageNodeId, uploadData.name, req.promptNodeId, req.prompt);
  req.onStatus?.("Queueing video model workflow");
  const queued = await fetch(`${base}/prompt`, { method:"POST", headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:workflow}),signal:AbortSignal.timeout(45000) });
  if (!queued.ok) {
    const detail = await queued.text().catch(()=>"");
    throw new Error(`ComfyUI video workflow rejected (HTTP ${queued.status}): ${detail.slice(0,250)}`);
  }
  const data = (await queued.json()) as {prompt_id?:unknown; error?:unknown};
  if (typeof data.prompt_id !== "string" || !data.prompt_id) {
    throw new Error(typeof data.error === "string" ? data.error.slice(0,250) : "ComfyUI returned no video prompt ID.");
  }
  for (let i=0; i<180; i++) {
    req.onStatus?.(`Generating video locally (check ${i + 1}/180)`);
    // Check promptly on the first attempt, then allow long-running GPU workflows.
    if (i > 0) await new Promise(resolve=>setTimeout(resolve, 2500));
    const historyResponse = await fetch(`${base}/history/${encodeURIComponent(data.prompt_id)}`,{cache:"no-store",signal:AbortSignal.timeout(10000)});
    if (!historyResponse.ok) continue;
    const history = (await historyResponse.json()) as VideoHistory;
    const url = findComfyVideoOutput(history, data.prompt_id, base);
    if (url) {
      req.onStatus?.("Real video generated");
      return {videoUrl:url, videoFormat:/\.webm(?:\?|$)/i.test(url) ? "webm" : /.webm(?:\?|$)/i.test(new URL(url).searchParams.get("filename") || "") ? "webm":"mp4"};
    }
    if (history[data.prompt_id]?.status?.status_str === "error") {
      throw new Error("ComfyUI video model execution failed. Check your workflow, installed nodes and server logs.");
    }
    if (history[data.prompt_id]?.status?.status_str === "success") {
      throw new Error("ComfyUI completed but saved no playable MP4/WebM video. Add SaveVideo or VHS_VideoCombine.");
    }
  }
  throw new Error("ComfyUI video model did not finish within the polling window.");
}
