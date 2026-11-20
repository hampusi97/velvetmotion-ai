# Canceling video generation in VelvetMotion Studio

The **Shorts Video** panel now shows **Cancel video request** while processing. This control aborts the active client-side operation, including source-image upload, ComfyUI prompt submission or history polling, a custom video provider request, and the local canvas animation fallback.

- Closing the Studio dialog or navigating away also aborts the current request.
- Cancellation produces a distinct status. **It does not silently create an animated still** when the user canceled a real AI job.
- Video generation remains explicitly opt-in; no background requests are started simply by opening Studio.
- Progress messages are suppressed after the user cancels, preventing stale completion indicators.

**Important limitation:** Canceling here stops the **browser/desktop request**. If ComfyUI or another provider already accepted a generation task, that server may continue using its GPU and may produce a file. The app does **not** invoke a global ComfyUI interrupt or queue-clearing endpoint because those actions could stop unrelated jobs and other users' work. To stop actual server-side computation, use the controls in your own inference server.

The automated tests cover canceling before image upload, after model submission, during polling, a custom backend request, and the animated-still fallback. A full real-server GPU test is still recommended.
