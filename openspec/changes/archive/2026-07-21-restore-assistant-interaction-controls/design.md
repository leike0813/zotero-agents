## Context

ACP Skills and SkillRunner both project backend execution into the Assistant Workspace, but their waiting-user shapes and action routes have diverged. ACP publication currently omits structured UI hints. SkillRunner quick controls emit `reply`, while its host boundary effectively accepts `reply-run`; an incorrect alias table masks rather than fixes the mismatch. Neither path has one validated interaction DTO or a token that binds a rendered control to the pending turn.

File requests add a stronger trust boundary. ACP can safely continue with workspace-relative paths only after host-side native selection and managed staging. SkillRunner's current backend has no upload endpoint, so plugin behavior must remain disabled unless an explicit handshake capability appears.

## Goals / Non-Goals

**Goals:**

- Project every supported waiting-user interaction through one bounded DTO while keeping JSON option values intact.
- Route every control through canonical model-produced actions and reject stale owner/status/token submissions.
- Stage ACP files atomically under a shallow `.acp-inputs/<short-key>/` workspace path without exposing source paths or bytes to child UI/transcript.
- Pre-wire SkillRunner multipart submission behind `skillrunner.interaction-files.v1` and conservative client limits.
- Preserve transcript-only and region-level DOM identity invariants.

**Non-Goals:**

- Implementing or changing the SkillRunner backend/submodule.
- Persisting file bytes or original paths in Assistant wire snapshots or transcripts.
- Treating cold transcript caches as correctness state or changing transcript store formats.
- Adding model setters or an independent continuation state machine.

## Decisions

### Use one strict pending-interaction DTO

`AssistantPendingInteraction` carries an interaction token, normalized input kind, prompt/hint, JSON-valued options, declared file slots, and file-reply capability/limits. Nested objects use exact-key checks, bounded collection sizes, bounded strings, and bounded serialized JSON. Pending `message` remains transcript content; only `ui_hints` drive interaction chrome. For SkillRunner, a valid `ui_hints.kind` overrides a degraded pending kind. ACP tokens use output revision with a stable legacy digest fallback; SkillRunner uses `pendingInteractionId`.

### Generate canonical actions in the panel model

The renderer renders action descriptors and never invents `reply`. SkillRunner emits `reply-run`; ACP emits its canonical continuation action, retaining raw JSON as `responseValue` alongside a display label. One host-boundary canonicalizer may accept actual legacy `reply`/`cancel` literals, but there is no alias map as a second action SSOT. Every submission revalidates owner, waiting state, and interaction token.

### Stage ACP files before continuation

The child sends only the interaction token. The host opens one native picker per slot, aborts on required cancellation, skips optional cancellation, then revalidates the pending owner/token. One owner/token may have one in-flight selection flow.

Files are copied into `.acp-inputs/.tmp-<submissionKey>` with collision-safe managed names and a privacy-safe manifest, then the directory is atomically renamed to `.acp-inputs/<turnKey>-<submissionKey>`. `turnKey` is a short digest of request id plus token. No per-slot directory is created. Managed directory segments, filenames, and complete relative paths share the runtime's path-length policy. Prompt text contains only shallow workspace-relative paths; transcript text contains display filenames only. Accepted-prompt failures retain staged files for existing recovery.

### Reuse the ACP reply state machine with split display and prompt text

Internal continuation requests carry `displayMessage` and `promptMessage`. Text, option, file, live-session, and recovery submissions use the same state transition and transcript publication path, avoiding a file-only state machine.

### Gate SkillRunner upload behavior by handshake capability

The plugin recognizes `skillrunner.interaction-files.v1` plus optional lower server limits. Without it, the declared file request and localized unsupported status remain visible and text composition remains available. With it, the same native-picker UX calls `submitInteractionFiles` and posts multipart `metadata` plus repeated binary `files` parts to `/v1/jobs/{requestId}/interaction/reply/files`. Plugin ceilings are eight files, 32 MiB per file, and 64 MiB total; lower advertised limits win. Child wire and transcript never carry paths or bytes.

### Keep interaction rendering region-scoped

Hint/reply/file controls are each derived from stable region signatures containing only visible content and open/collapsed state. Transcript revision, page signatures, streaming chunks, event counts, loading, and prompting tails cannot enter those signatures. Transcript-only updates preserve all non-transcript managed-region DOM identities.

## Risks / Trade-offs

- **Native picker or copy failure after partial selection** → use a sibling temporary directory and atomic rename; avoid submitting until staging completes.
- **A stale control replies to a later turn** → bind every action to owner plus interaction token and re-check after asynchronous picker work.
- **Unexpected option data inflates or mutates the wire** → enforce exact keys, JSON serializability, and collection/size limits at the shared boundary.
- **Future SkillRunner capability differs from the pre-wired request** → keep the route disabled by default and isolate request construction in the management client.
- **Staged files outlive a failed continuation** → intentionally retain only after prompt acceptance so existing recovery can reuse the exact governed paths.
