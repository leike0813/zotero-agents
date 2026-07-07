## Why

Completed ACP Chat and ACP Skills transcripts can be large. The current cold
foreground path still treats full mirror hydration as the practical prerequisite
for rendering the selected transcript page, which makes task switching slow and
can reset loading UI while another prompt is active.

The transcript store already supports index-backed page reads. Cold transcript
foreground rendering should use that page read directly, while full mirrors
remain a live-streaming data structure and a bounded performance cache.

## What Changes

- Render cold selected transcripts page-first without waiting for full mirror
  hydrate.
- Keep live/prompting/lifecycle-open transcript mirrors pinned.
- Retain cold full mirrors in a bounded 10-slot owner-level LRU cache.
- Keep ACP Chat and ACP Skills cache policies subsystem-local.
- Do not change transcript JSONL/index formats and do not migrate historical
  transcript files.

## Impact

- `src/modules/acpSkillRunStore.ts`: ACP Skills selected page read, mirror
  retention, and cold mirror LRU.
- `src/modules/acpChatPanelReadModel.ts` / `src/modules/acpSessionManager.ts`:
  ACP Chat selected page read and cold mirror LRU.
- `AGENTS.md`: Assistant transcript cold-load cache hard rule.
- Tests for ACP Chat, ACP Skills, and source-level UI smoke guards.
