## Why

ACP Skills currently routes every adapter diagnostic through the canonical run-event persistence path, multiplying run-row, event-row, and Workspace publication work without contributing to transcript, recovery, or execution state. ACP Chat avoids immediate writes but later embeds transient diagnostics in business conversation snapshots, making diagnostic observations part of restart state despite having no recovery role.

This release needs a narrow R1 governance change that removes diagnostic-driven business I/O while preserving every business persistence and recovery contract before the Assistant Workspace and ACP Session Manager are redesigned.

## What Changes

- Classify adapter diagnostics, stderr tails, and diagnostic-derived lifecycle observations as non-canonical runtime evidence.
- Route ACP Skills diagnostics away from `AcpSkillRunRecord`, run-event rows, transcript invalidation, and Workspace business changes.
- Keep ACP Chat diagnostics owner-scoped in memory while omitting them from future conversation-state writes and restart hydration.
- Persist all detailed diagnostic evidence only in debug-mode buffered audit files; retain bounded production `warn`/`error` runtime logs.
- Add bounded backpressure and best-effort release semantics only to audit buffers, without changing transcript or other business buffers.
- Preserve existing low-volume ACP Skills audit artifacts, historical database rows, transcript formats, result/apply state, and recovery data.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-opencode-global-chat`: Keep diagnostics as current-process presentation state rather than persisted conversation recovery state.
- `acp-skillrunner-compatible-runner`: Make ACP adapter diagnostics observational and prohibit diagnostic-driven canonical run persistence or publication.
- `acp-skills-interactive-execution`: Clarify that archiving retains business history, logs, and existing audit artifacts without requiring adapter diagnostics in canonical run events.
- `acp-engine-session-workspace-governance`: Clarify owner-scoped diagnostic switching and exclude transient diagnostics from restart recovery.

## Impact

- ACP Skills orchestrator diagnostic listeners and run audit routing.
- ACP Chat session snapshots, conversation serialization, diagnostic presentation, and debug audit lifecycle.
- The shared buffered-write coordinator's optional audit-only backpressure policy.
- Existing profiler/test seams used to prove diagnostic-caused business writes are zero.
- No external API, dependency, business-store schema, transcript format, or historical-data migration.
