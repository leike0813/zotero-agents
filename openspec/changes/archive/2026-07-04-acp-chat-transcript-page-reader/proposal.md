## Why

ACP Chat already stores transcript content in the durable file-backed transcript
store, and the previous structural snapshot change made it possible to read
panel structure without cloning every transcript row. The next migration step
needs a stable transcript page reader DTO that carries explicit conversation
scope metadata.

The current reader returns the raw store page and flushes all pending ACP Chat
transcript writes before every read. That is too broad for the upcoming sidebar
page orchestration and risks reproducing the failed backup branch's high-cost
read path.

## What Changes

- Enrich `readAcpConversationTranscriptPage()` with explicit `backendId`,
  `conversationId`, `requestId`, `transcriptRevision`, and `limit` fields.
- Keep the existing `.items` behavior compatible for current callers.
- Resolve conversation scope before reading and flush only the target session's
  pending transcript writes.
- Continue reading from the durable transcript store as the authoritative page
  source.

## Non-goals

- Do not connect ACP Chat child rendering to transcript pages.
- Do not add or route `load-transcript-page` actions.
- Do not change sidebar selected-page orchestration.
- Do not change frontend or conversation subscription semantics.
- Do not add listener `itemMode` maps, session index caches, or a second UI
  refresh subscription.
- Do not use `notifyFrontend: false` as a UI delivery model.

## Impact

- `src/modules/acpSessionManager.ts`
- `test/core/96-acp-session-manager.test.ts`
- `openspec/specs/acp-chat-file-backed-transcript-state/spec.md`
