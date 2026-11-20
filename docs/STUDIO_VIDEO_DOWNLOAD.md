# Downloading Studio AI video clips

Video providers such as local ComfyUI often serve the final MP4/WebM clip from another origin (for example, `http://127.0.0.1:8188/view?filename=...`). Browsers may ignore the HTML `download` attribute for cross-origin links and simply open the clip in a new tab.

Studio's **Download clip** control now explicitly fetches the video file, validates the response and saves it under a VelvetMotion filename through a temporary local Blob URL.

- Accepts HTTPS video links, local HTTP inference servers, and browser Blob URLs.
- Rejects JavaScript/file URLs, insecure remote HTTP endpoints and HTML/JSON responses disguised as video.
- Rejects missing/empty files and enforces a 250 MB browser download limit.
- Reclaims the temporary Blob URL after the download click.
- Provides an **Open clip** link if the provider's browser CORS rules or download limit prevent direct saving.

Note: even a successful local ComfyUI video render may require enabling browser CORS access on the local server to download through a hosted HTTPS site. If the download fails, Open clip and use the browser's save command or retrieve the file directly from ComfyUI's output directory.

The existing canvas animated-still fallback remains labeled as such; downloading it does not turn it into a generative video.
