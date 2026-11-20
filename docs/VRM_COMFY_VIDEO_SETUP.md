# Experimental VRM avatars & genuine ComfyUI video workflows

This release adds two optional, offline-first enhancements. No external avatars or generative model weights are bundled. User content is never sent to a service until the user explicitly starts generation.

## 3D VRM companion preview

1. Open a companion's voice call.
2. Select **Import .vrm avatar** and choose a locally obtained, licensed **self-contained VRM 0.x or 1.0** file (80 MB maximum).
3. The avatar is validated as a binary glTF/VRM file with embedded resources and saved **per companion in IndexedDB**. External texture/geometry URLs are rejected.
4. Turn on **3D avatar** to view the model. Voice playback drives available mouth morph targets; the model also has gentle idle motion and blinking when compatible morph targets exist. A microphone/camera remains separately permission controlled.
5. **Remove 3D avatar** removes that companion's model from local IndexedDB.

**Scope:** this is a Three.js GLTFLoader-based *basic VRM model preview*, not the complete VRM humanoid runtime: MToon material parity, spring bones, VRM expression-manager semantics, motion retargeting, model lip synchronization with audio phonemes, and Live2D/Cubism animation are **not implemented**. For full-featured Live2D, the Live2D Cubism SDK/runtime and compatible, properly licensed Live2D assets would be needed; this build does not pretend a static portrait is Live2D.

VRM file licensing varies. Only upload models you own or have permission to use. The model is never uploaded to VelvetMotion or GitHub.

## Real local ComfyUI video model

1. Install ComfyUI locally and **one supported image-to-video workflow** (Wan, LTX, FramePack, or another supported model with all required nodes, weights, memory and dependencies installed).
2. In ComfyUI, prepare a workflow using **LoadImage** for the input frame, optional **CLIPTextEncode** for the prompt, and a supported MP4/WebM output node such as **SaveVideo** or **VHS_VideoCombine**. The latter provides file metadata under `gifs` in the completed ComfyUI history.
3. Export using **Save (API Format)**. Regular workflow canvas JSON is not accepted.
4. Go to VelvetMotion **Advanced Media → Img2vid / real clips**, leave the separate generic video endpoint blank, enable **Use my local ComfyUI image-to-video workflow**, select your local server URL (default `http://127.0.0.1:8188`), and upload the API-format workflow JSON (less than 250 KB).
5. The form auto-selects the first `LoadImage` and `CLIPTextEncode` node IDs. Verify them and change IDs if the workflow has several image or text nodes. Click **Save settings**.
6. In Studio, select a source image and click **Generate**. The app uploads only that source image, queues your workflow at `/prompt`, polls `/history/{prompt_id}`, and renders the video returned by `/view`, if a real MP4 or WebM output exists. It reports progress stages and backend errors.

A reachable ComfyUI API or an imported workflow **does not prove generation will work**: the GPU, compatible model, nodes and codecs must all be installed. If generation fails, Studio may offer the existing browser **animated-still effect** as a visually distinct fallback, never a genuine AI clip. The ComfyUI backend does not run until configured and invoked.

Cross-origin browser access may require local ComfyUI CORS configuration and an HTTPS-compatible localhost bridge if VelvetMotion runs as a website. Never publicly expose a ComfyUI API without proper authentication.

**Sources:** [ComfyUI API OpenAPI](https://github.com/Comfy-Org/ComfyUI/blob/master/openapi.yaml), [ComfyUI Save Video](https://github.com/Comfy-Org/docs/blob/main/built-in-nodes/SaveVideo.mdx), and [ComfyUI VideoHelperSuite](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite). No third-party code was copied.

## Production and desktop limitations

The post-merge GitHub Workers production deploy still requires the owner's private `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets. The user's Cloudflare Pages previews are separate. Desktop installer publication and Tauri's **signed auto-update** are different things: unsigned installers do not confer cryptographically verified automatic updates.

Unit tests validate GLB/VRM metadata, no external asset references, ComfyUI node replacement, upload/queue/history contracts, and video file metadata. Only a real local ComfyUI/VRM setup can verify graphical quality or model performance.
