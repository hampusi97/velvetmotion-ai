# JARVIS reference review and VelvetMotion integration

Reference: https://github.com/Likhithsai2580/JARVIS (MIT License; copyright 2024 Likhithsai2580).
The reference README says that repository is outdated and points to a newer MARK5 version.

## Architecture decision

JARVIS is a Python-based multifunction desktop assistant. VelvetMotion is a React/Next.js/Tauri companion application with existing chat, local LLM, voice, and media integrations. **Do not copy the Python project wholesale or execute shell commands from AI-generated or spoken text.** This release uses its voice-control concept, not its source code.

## Implemented native adaptation

- The companion voice call supports a small **allowlist** of natural-language commands. "End call" and "stop listening" work inside a call; microphone pause/resume also has an explicit button.
- All other speech is conversation input, never an OS command, shell invocation, file operation, or extension call.
- The recognizer remains browser-provided; cloud services may be involved depending on the browser implementation. No claim of offline speech recognition or wake-word detection.
- Unit tests in `lib/voiceCommands.test.ts` ensure arbitrary utterances are not interpreted as executable commands.

## Not yet implemented

- Offline wake-word recognition, OCR, camera object detection, computer control and screen sharing.
- Permission dialogs and user opt-in would be required for capabilities accessing camera, desktop, files or microphones.
- None of those features should be described as functioning until implemented and tested.

MIT attribution is included for this **reference**. No third-party source code is incorporated.
