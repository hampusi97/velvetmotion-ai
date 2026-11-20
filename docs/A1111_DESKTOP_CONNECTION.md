# AUTOMATIC1111 / Forge connection on VelvetMotion Desktop

The desktop app supports local Stable Diffusion WebUI-compatible servers, including AUTOMATIC1111 and Forge, alongside ComfyUI.

## Setup
1. Install AUTOMATIC1111 or Forge independently from the official project, and install a checkpoint you are licensed to use.
2. Start the server with its `--api` option at `http://127.0.0.1:7860`. If your browser or desktop webview reports a cross-origin error, consult the server's official CORS settings. Avoid exposing your unauthenticated WebUI to the public Internet.
3. Open **Download Desktop / Local AI** and select **Test connection**. The A1111 / Forge row now probes `/sdapi/v1/sd-models` and displays the real reachability status rather than a hard-coded Offline state.
4. In **Advanced Media**, select **AUTOMATIC1111 / Forge**, set the local image base to `http://127.0.0.1:7860`, choose an installed checkpoint, and save settings.
5. Generate a harmless test portrait in Studio; a reachable API alone does not verify successful model execution.

The desktop Content Security Policy now allows outgoing API requests **only** to the loopback URL `http://127.0.0.1:7860` for this backend. This does not grant wildcard insecure HTTP access, and it does not alter camera, microphone, files, or desktop privileges.

Unit tests ensure the detector rejects unrelated services returning HTTP 404 or invalid JSON. A valid but empty model list reports the WebUI API as reachable, **not** that a checkpoint is installed. Local generation and GPU performance still require a real-device test.
