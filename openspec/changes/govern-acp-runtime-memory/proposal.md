## Why

ACP Skills can retain large runtime graphs after real-world runs: live
controllers keep adapter and orchestration closures alive, while the run store
hydrates complete historical payloads into memory. In long Zotero sessions this
can grow without a practical bound, especially when transcripts, candidates,
result JSON, and prompt context are duplicated across controller closures, run
records, and UI snapshots.

## What Changes

- Replace long-lived ACP Skill controllers with thin live session handles that
  own only active connection resources.
- Move ACP Skill transcripts, output revision candidates, and run continuation
  context out of database payloads into files under the run runtime directory.
- Keep run store persistence and hydration metadata-only, with bounded previews
  for UI summaries.
- Detach successful ACP Skills runs after workflow apply while preserving
  recoverability through `sessionId`.
- Bound `waiting_user` live handles to 30 minutes before local detach.
- Cap live ACP Chat adapters at three connections, evicting the least recently
  active idle connection when possible.
- Ensure archived ACP Skill runtime files follow the existing task history
  retention lifecycle.

## Capabilities

### New Capabilities

- `acp-skill-run-file-backed-runtime-state`: ACP Skill transcripts, output
  revisions, and continuation context are file-backed and lazily loaded.

### Modified Capabilities

- `acp-skills-interactive-execution`: Success no longer keeps a live local
  controller; follow-up is recoverable through the existing session id.
- `acp-skills-session-recovery`: Recovered replies use file-backed continuation
  state rather than controller closure state.
- `acp-engine-session-workspace-governance`: Runtime files for ACP Skill runs
  are governed by run workspace retention.
- `acp-chat-session-management`: ACP Chat live adapter count is bounded.

## Impact

- Affected modules: ACP Skill run store, ACP Skill runner orchestrator, ACP Chat
  session manager, runtime persistence, and ACP Skill panel snapshot model.
- Affected data: existing ACP Skill run payloads with embedded transcript or
  candidate text are lazily migrated to runtime files.
- No new external dependency is required.
