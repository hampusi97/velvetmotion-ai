# VelvetMotion development audit — 2026-11-20

## Verified starting point

Audited branch: `main`, commit `64d4f1ad7fcd571ca93ee1ad8517023980ab71eb` (PR #17). PRs #14, #15, #16 and #17 are present in its history. This report describes the inspected source and retrieved GitHub status; it does not certify that hosted inference, native installation or production deployment is operational.

GitHub baseline:

- Validate and CodeQL succeeded on `64d4f1a`.
- Web workflow run `44832707917` passed audit, lint, TypeScript and static build, then failed at **Verify Cloudflare credentials for production**. The logs explicitly report missing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Latest public desktop release at initial inspection: **v1.0.26**. **v1.0.27** was a draft with incomplete assets and its main-branch release workflow pending. No updater manifest or signatures appeared in the inspected v1.0.26 assets.
- No open standalone issues were returned. Open PRs: #4, #5, #10 and #11. Their changes may overlap current main; review their diffs before merging. They were not merged by this work.

## Upstream changes incorporated during this audit

Before submitting, re-fetched and rebased onto `4914b3eedd6720f5dc052b334ed960696343ec6d`:

- `cb91b5f` wraps the chat composer in a form for reliable submission. Preserved.
- PR #18 (`5239d5e`) verifies native Cloudflare Git deployment checks when Wrangler secrets are absent. Web run `44834774455` succeeded on the new main, including native Git deployment verification. The historical missing-secrets failure above is no longer the current CI state.
- PR #19 (`4914b3e`) adds actual A1111/Forge detection and desktop loopback access. Preserved with its tests and CSP checks.
- Latest public release at this refresh: **v1.0.29**, with platform installers and no updater signature/manifest assets in the inspected listing. The newer main's desktop workflow was still running at inspection.

The unified test runner automatically includes the new `localEngineBridge` and Cloudflare verifier test files. No upstream fixes were reverted.

## Architecture and capability audit

| Area | Source and findings | Action / remaining verification |
| --- | --- | --- |
| Application | Next.js 15.5.29 / React 18 static export. Most routes share `AppShell`; the former eager component graph reported 745 kB initial JS in CI. | Load optional panels on demand. Current local build reports about 341 kB; this is a bundle metric, not a measured latency claim. |
| Discovery | Static flagship/legacy cast, separate import keys, existing favorites and mood filter. Cards skipped full profiles; imported categories were computed only at mount. | Added `/companions/`, refreshed facets, combined filters, profile navigation, storage errors and reusable favorites. |
| Character persistence | Different views read different storage keys; profile controls mutated props without saving. Custom images could be replaced by an unrelated stock portrait. | Unified custom/import loading with validation and stable IDs. Roster, profile, My Girls, Studio and chat switcher use saved characters and safe raster portraits. |
| Original characters | Six existing original illustrated starter characters. | Expanded to ten distinct adult profiles. Illustrations are explicitly identified; real local portrait generation remains model-dependent. |
| Cards | PNG importer validates CRC, file size and V3 precedence. Legacy Studio extractor did not use the same checks. Imported voice/appearance metadata and export fields were incomplete. | Shared validated PNG decoder; V2/V3 JSON exports, required fields, metadata retention and lore insertion order. CHARX, compressed PNG metadata and full third-party runtime semantics remain unsupported. |
| Text models | `chatRouter` supports Ollama, KoboldCpp, custom OpenAI-compatible endpoints and selected cloud routing; respects explicit local selection. | Main chat now detects provider failure before persisting an assistant turn; empty replies no longer become canned dialogue. Retry reuses the unanswered turn. Live model quality still needs model-backed tests. |
| Memory | Per-character short/mid/long memory, categorized vault, progression and keyword lorebook context exist. | Profiles expose the existing vault and saved activity. Card exports exclude user memories. Imports preserve IDs for saved edits; imported portable cards create their own IDs. |
| Images | Actual ComfyUI/A1111 adapters, checkpoint discovery, img2img and hosted provider paths exist with contract tests. | Profile replacement supports explicit local generation and uploads; no success label or overwrite if a provider fails. GPU generation and browser CORS still require hardware tests. |
| Video | `comfyVideo` uploads a source, submits API workflow, polls history and reads real MP4/WebM; separate animated-still renderer exists. | Existing contract tests run under the unified command. Live workflows, codecs and GPU memory requirements remain unverified here. |
| Voice / avatars | Browser recognition, synthetic TTS adapters and calls; Three.js experimental embedded VRM rendering. | Profile preview identifies the voice engine used and stops on unmount. Full humanoid animation, expression retargeting and target-device audio tests remain future work. |
| Native app | Tauri 2 with local-service diagnostics, restricted media CSP, optional signed updater, tray and shortcut commands. | Existing CSP/release checks passed. No local Rust toolchain was available; native checks are delegated to the existing GitHub workflow. No signing credentials or CSP broadening introduced. |
| Deployment | Cloudflare static Worker config and independent desktop release pipeline. Node 20 workflows conflicted with the installed GenAI SDK's Node 22 requirement. | Align package engines, `.nvmrc`, Wrangler and build workflows to Node 22. Preserved the new native Git deployment verifier and the optional direct Wrangler path. |
| Verification | `npm test` omitted many suites that Validate listed individually; Validate omitted the older core command. | Discover all unit tests in one fail-fast runner; preserve content, smoke and Python checks. Add desktop/mobile browser checks with screenshots and isolated test storage. |

## Work completed in this branch

- Shared dark violet/charcoal library controls, larger portrait cards, visible keyboard focus and reduced-motion treatment.
- Portrait-led profile, true saved customization, favorites, voice preview, memory panel, local image generation, replacement preview and V2/V3 card download.
- Ten original starter characters, including Noor Haddad, Imani Brooks, Astrid Lind and Rhea Solis; existing starters remain opt-in.
- Consistent imported/custom selection in Studio and chat; removed nested buttons in My Girls.
- Provider failures displayed as status, with a retry action that does not duplicate the unanswered user turn or grant response rewards.
- Optional feature bundles split from initial loading; complete test discovery and Node 22 build configuration.

The former profile's Google Meet/Gmail/Drive controls were removed from this surface: they created external Google resources and did not connect to the companion AI call or character-card backup flow. Portable card downloads, the existing memory backup and actual AI Studio are the relevant actions now.

## Prioritized backlog

| Priority | Deliverable | Completion evidence |
| --- | --- | --- |
| P0 | Verify the intended production domain after merging. Native Git checks now pass upstream; direct Wrangler credentials are optional. | Successful deployment for this branch after merge and the expected commit from the actual production domain. |
| P0 | Bootstrap trusted desktop signing with the existing owner-side helper. | Complete published release, valid updater manifest/signatures, installation and update/restart on each supported OS. |
| P0 | Prove real inference on target hardware. | Text reply, playable neural speech, newly generated image and multi-frame generated video; retain model/workflow/version and failure evidence. Mock contracts are insufficient. |
| P0 | Decide hosted production scope and implement authenticated private media/jobs, rate limiting, age/consent enforcement and provider-compatible billing where needed. | Server-enforced behavior and abuse/error tests. A frontend age declaration is not production identity verification. |
| P1 | Make cloud backup lossless and predictable. | Preserve user portraits rather than the current placeholder substitution; bound imported metadata; explicit conflict and quota handling across devices. |
| P1 | Unify the remaining legacy homepage/group/voice character surfaces around the shared library. | Editing an appearance/name is reflected across every entry point; no stock-face substitutions or unsupported “verified/live” presentation. |
| P1 | Add provider cancellation and reliable job resumption. | Navigating away does not update another character's state; jobs can be cancelled/resumed with accurate progress and no false completion. |
| P1 | Finish card interoperability. | Preserve inactive/advanced lore semantics, alternate greetings in runtime, PNG export parity and clearly identified unsupported V3 assets. Imported code is never executed. |
| P2 | Expand character art and expressive avatar quality with licensed assets. | Verified redistribution rights, distinct identities, device performance measurements and accessible fallbacks. |
| P2 | Standardize the remaining voice, creation, collection, settings and onboarding surfaces. | Reviewed desktop/mobile flows, readable controls, consistent focus and motion behavior, no placeholder or misleading actions. |

## Verification and limits

Local baseline: 76 TypeScript tests, 8 release/CSP tests, content validation, platform smoke checks and 3 Python tests passed. After implementation the unified runner passed **95 Node/TypeScript tests plus 3 Python tests** before the final rebase; the final runner also includes the newly merged upstream suites, content validation and platform smoke checks. Local lint and TypeScript passed; the production static export succeeded. Existing unrelated lint warnings remain.

The selected workspace permits building the app but blocks local Chromium Unix sockets. The shared browser also could not reach the local preview. Browser screenshots and flow assertions must therefore be verified by the added GitHub Actions job; they are not claimed as locally passed. Browser tests cover desktop and mobile discovery, favorites, filters, profile saving/reload, portrait failure, starter import, V3 export, memory, Studio selection, library membership and chat retry. External account and inference requests are blocked in those tests.

No production deployment, release publishing, signing activation, third-party character scraping or GPU provisioning was performed by this branch. The work is submitted for review separately from the external setup blockers.

## Card references

- V2: https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md
- V3: https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md

The new exports include the required V2/V3 data fields. Unknown imported metadata is retained as inert JSON; unsupported runtime instructions are not promoted to application/system privileges.
