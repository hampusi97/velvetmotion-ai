# Third-party companion, media, and avatar references (2026-11-20)

These projects were reviewed as possible integrations for VelvetMotion. **No third-party character images, names, profiles, binaries, or application source have been copied into the app.** Original starter companion profiles and illustrations are developed specifically for VelvetMotion.

## Implemented here
- **AUTOMATIC1111 / Forge image server**: lightweight HTTP integration using `/sdapi/v1/sd-models`, `/sdapi/v1/txt2img`, and `/sdapi/v1/img2img` to list installed checkpoints and generate images. Uses a per-request checkpoint override, not a global setting change. No AUTOMATIC1111 source code is bundled. The upstream project uses AGPL-3.0; users install the application separately.
- **Character discovery idea**: six original fictional adult profiles (Vivienne, Cleo, Alma, Skye, June, Zara) available as an opt-in starter collection inside Character Import. They use abstract original illustrated placeholders, converted into safe PNG thumbnails when added. They are not copied from another repository.
- **SillyTavern image generation idea**: reusable image backends are selectable in Advanced Media; a compatible model must be installed locally. SillyTavern's image generation is documented as a built-in extension, not an extra standalone code repository to bundle.
- **Original per-character media**: imported PNG portraits and self-created raster avatars can display in the Discover roster and chat instead of silently assigning the face of a different preinstalled character.

## Research only / later work
- [Soul of Waifu](https://github.com/jofizcd/Soul-of-Waifu): GPL-3.0. Ideas include persistent character identity, Live2D/VRM avatars and narrative continuity. Avoid copying GPL application code into a differently licensed product without a full compatibility analysis.
- [N.E.K.O](https://github.com/Project-N-E-K-O/N.E.K.O): Apache-2.0. Ideas include character-agent autonomy, plugin isolation and richer multimodal experiences. Future OS-control features require narrowly scoped permissions and explicit approval.
- [OpenAmika](https://github.com/zeekk0/OpenAmika): README describes MIT; verify the actual license file and any third-party Live2D/model assets before reuse. Voice and memory architecture are useful references.
- [SillyTavern Live2D extension](https://github.com/SillyTavern/Extension-Live2d): GPL-3.0. Animations need a separate compatible renderer, model files and licensing; mere assignment of a model path would not mean working Live2D.
- [Hugging Face video generation collection](https://huggingface.co/collections/kahramango/video-generation): links to many **different** models and Spaces, including FramePack, Wan and LTX. A model page is not a plug-and-play compatible HTTP API. For real generative clips, use the already implemented configurable image-to-video endpoint with the documented request/response protocol and a running compatible service. Canvas fallback only animates a still.
- [OpenSourceGen](https://opensourcegen.com/): public image/video generator website. No verified API contract or permission to scrape or automate. Do not embed it as a backend without documented authorization.
- [GirlChat AdultCompanion 2026](https://github.com/liannainefficient679/GirlChat-AdultCompanion-2026): MIT code license; repository visibly contains a README and one ZIP archive, not directly inspectable character/image source files. Do not execute the archive or claim portraits may be redistributed without verifying contents and rights.
- [bradsiemn/candyaiclone](https://github.com/bradsiemn/candyaiclone): README-only design/monetization discussion with no identified license; not a character pack or a source-code application. Avoid dark patterns, compulsive emotional upsells, or undisclosed behavioral profiling.

## Getting started with AUTOMATIC1111 or Forge
1. Install the WebUI and a compatible image checkpoint locally. Launch the WebUI with `--api`, default `http://127.0.0.1:7860`. Check the WebUI project's official installation documentation.
2. In VelvetMotion **Advanced Media**, set **Local image endpoint** to the server URL, select **AUTOMATIC1111 / Forge**, enable **Prefer local**, and click **Find installed models**.
3. Select a real installed checkpoint and choose the img2img variation strength. Save settings. If browser access is blocked by CORS or mixed-content restrictions, use a suitable local desktop/runtime bridge; do not publicly expose the WebUI without authentication.
4. Test a harmless text-to-image prompt. For img2img, select an **original fictional adult reference image** in Studio. The selected strength controls how much the image changes, not a guaranteed face identity match.
5. If the API reports an error, VelvetMotion displays the failure rather than silently substituting fake imagery.

## Safety & licenses
Model outputs and redistributable media are separate from code licenses. Review checkpoint/model and third-party image rights before publishing or bundling them. Do not assume any unrelated repo's screenshots or character designs are free to copy.
