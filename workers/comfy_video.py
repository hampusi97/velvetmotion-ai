"""Submit a trusted, locally configured image-to-video workflow to ComfyUI."""

from __future__ import annotations

import base64
import binascii
import json
import os
import pathlib
import re
import secrets
import urllib.parse
import urllib.request
import uuid

IMAGE_TYPES = {"png": "png", "jpeg": "jpg", "webp": "webp"}
VIDEO_TYPES = {".mp4": "video/mp4", ".webm": "video/webm"}
MAX_REQUEST_BYTES = 16 * 1024 * 1024
JOB_ID = re.compile(r"[a-f0-9-]{36}", re.IGNORECASE)
WAN_VIDEO_WORKFLOW = pathlib.Path(__file__).with_name("workflows") / "wan22-ti2v-5b.json"
VIDEO_CHECKPOINT_INPUTS = {
    "UNETLoader": ("diffusion_models", "unet_name"),
    "CLIPLoader": ("text_encoders", "clip_name"),
    "VAELoader": ("vae", "vae_name"),
}


def _workflow_input(value, substitutions):
    if isinstance(value, str):
        return substitutions.get(value, value)
    if isinstance(value, list):
        return [_workflow_input(item, substitutions) for item in value]
    if isinstance(value, dict):
        return {key: _workflow_input(item, substitutions) for key, item in value.items()}
    return value


def _upload_image(comfy_base, data_url):
    match = re.fullmatch(r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)", data_url)
    if not match:
        raise ValueError("Select an inline PNG, JPEG or WebP source image.")
    try:
        image = base64.b64decode(match[2], validate=True)
    except binascii.Error as exc:
        raise ValueError("The source image data is invalid.") from exc
    if not image:
        raise ValueError("The source image is empty.")
    extension = IMAGE_TYPES[match[1]]
    boundary = uuid.uuid4().hex
    filename = f"velvetmotion-{uuid.uuid4().hex}.{extension}"
    prefix = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{filename}\"\r\n"
        f"Content-Type: image/{match[1]}\r\n\r\n"
    ).encode("ascii")
    body = prefix + image + f"\r\n--{boundary}--\r\n".encode("ascii")
    request = urllib.request.Request(
        f"{comfy_base}/upload/image", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        uploaded = json.load(response)
    return "/".join(part for part in (uploaded.get("subfolder"), uploaded["name"]) if part)


def load_video_workflow(workflow_path):
    graph = json.loads(pathlib.Path(workflow_path).read_text(encoding="utf-8"))
    if not isinstance(graph, dict) or not graph or not all(
        isinstance(node, dict) and "class_type" in node and isinstance(node.get("inputs"), dict)
        for node in graph.values()
    ):
        raise ValueError("Export the video workflow in ComfyUI API format.")
    if not any(node["inputs"].get("image") == "{{image}}" and node["class_type"] == "LoadImage"
               for node in graph.values()):
        raise ValueError("Set a LoadImage node's image input to {{image}} in the workflow.")
    return graph


def check_video_workflow(comfy_base, workflow_path):
    graph = load_video_workflow(workflow_path)
    with urllib.request.urlopen(f"{comfy_base}/object_info", timeout=3) as response:
        node_info = json.load(response)
    missing_nodes = sorted({node["class_type"] for node in graph.values()} - node_info.keys())
    if missing_nodes:
        raise RuntimeError(f"Install or update these ComfyUI nodes: {', '.join(missing_nodes)}.")
    for node in graph.values():
        checkpoint = VIDEO_CHECKPOINT_INPUTS.get(node["class_type"])
        if checkpoint:
            folder, key = checkpoint
            filename = node["inputs"].get(key)
            if not isinstance(filename, str):
                continue
            with urllib.request.urlopen(f"{comfy_base}/models/{folder}", timeout=3) as response:
                installed_models = json.load(response)
            if filename not in installed_models:
                raise RuntimeError(f"Missing {filename}. Place it in ComfyUI/models/{folder}/.")


def queue_video(comfy_base, workflow_path, payload, forward_json):
    if not isinstance(payload, dict):
        raise ValueError("The video request must be a JSON object.")
    graph = load_video_workflow(workflow_path)
    if payload.get("adultMode") and payload.get("sourceType") != "fictional":
        raise ValueError("Adult rendering requires an original fictional adult source.")

    duration = payload.get("durationSec", 5)
    resolution = payload.get("resolution", 720)
    speed = payload.get("speed", 1)
    if duration not in (3, 5, 8) or resolution not in (480, 720, 1080) or speed not in (0.75, 1, 1.25):
        raise ValueError("Choose a supported video duration, resolution and speed.")
    if pathlib.Path(workflow_path).resolve() == WAN_VIDEO_WORKFLOW.resolve() and resolution == 1080:
        raise ValueError("The bundled Wan2.2 workflow supports 480p and 720p. Select either in Studio.")
    width, height = {480: (480, 832), 720: (704, 1280), 1080: (1088, 1920)}[resolution]
    prompt = (str(payload.get("prompt", ""))[:600] if payload.get("sourceType") == "fictional"
              else "Neutral nonsexual portrait animation, subtle head movement, fully clothed.")
    image = _upload_image(comfy_base, str(payload.get("image") or payload.get("imageUrl") or ""))
    workflow = _workflow_input(graph, {
        "{{image}}": image,
        "{{prompt}}": prompt,
        "{{durationSec}}": duration,
        "{{resolution}}": resolution,
        "{{width}}": width,
        "{{height}}": height,
        "{{frames}}": duration * 24 + 1,
        "{{fps}}": 24 * speed,
        "{{seed}}": secrets.randbits(63),
    })
    queued = forward_json(f"{comfy_base}/prompt", {"prompt": workflow}, timeout=20)
    job_id = queued.get("prompt_id", "")
    if not isinstance(job_id, str) or not JOB_ID.fullmatch(job_id):
        raise RuntimeError("ComfyUI did not return a usable job ID.")
    return job_id


def video_output(comfy_base, job_id):
    with urllib.request.urlopen(f"{comfy_base}/history/{job_id}", timeout=10) as response:
        result = json.load(response).get(job_id)
    if not result:
        return None
    if result.get("status", {}).get("status_str") == "error":
        raise RuntimeError("ComfyUI could not render this job. Check its server logs.")
    for node in result.get("outputs", {}).values():
        for key in ("videos", "gifs", "images"):
            for file in node.get(key, []):
                filename = file.get("filename", "")
                content_type = VIDEO_TYPES.get(pathlib.PurePath(filename).suffix.lower())
                if content_type and file.get("type") == "output":
                    query = urllib.parse.urlencode({
                        "filename": filename, "subfolder": file.get("subfolder", ""), "type": "output",
                    })
                    return f"{comfy_base}/view?{query}", content_type
    if result.get("status", {}).get("completed"):
        raise RuntimeError("The workflow finished without an MP4 or WebM output.")
    return None


def allowed_origin(origin):
    if not origin:
        return True
    origins = os.environ.get(
        "VELVET_VIDEO_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://velvetmotion-ai.hampusi97.workers.dev,tauri://localhost,http://tauri.localhost",
    )
    return origin in [entry.strip() for entry in origins.split(",") if entry.strip()]
