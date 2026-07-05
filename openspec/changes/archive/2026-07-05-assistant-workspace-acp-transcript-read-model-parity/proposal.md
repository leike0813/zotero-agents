## Why

ACP Chat and ACP Skills both persist canonical transcripts outside the panel
payload, but their Assistant Workspace read-models have drifted. ACP Chat uses
selected pages without the same active-scope streaming policy as ACP Skills, and
ACP Skills selected pages now read canonical mirror content directly, bypassing
the UI-visible transcript semantics that made the streaming render preference
work in v0.5.6.

## What Changes

- Align ACP Chat with ACP Skills around one selected transcript page
  publication model: structural panel metadata plus a scope-checked selected
  page rendered by the shared virtualized transcript renderer.
- Add a shared UI-visible transcript page projection rule used by both ACP Chat
  and ACP Skills before paging.
- Respect `assistantStreamingRenderEnabled` consistently: streaming
  message/thought rows are visible only when the preference is enabled, while
  structural rows remain visible.
- Make ACP Chat panel selected pages read from the hydrated conversation mirror
  for Assistant Workspace snapshots and page requests; durable transcript page
  reads remain available as the public file-backed API.
- Keep failed-route guardrails: no new subscription channel, no
  `notifyFrontend: false` delivery, no listener item-mode map, no session index
  cache, and no backend refresh in snapshot post paths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-file-backed-transcript-state`: ACP Chat Assistant Workspace selected
  transcript pages use the hydrated mirror read-model and streaming-aware
  UI-visible projection.
- `acp-skill-run-file-backed-runtime-state`: ACP Skills selected transcript
  pages use the same streaming-aware UI-visible projection before paging.

## Impact

- Affected modules: ACP Chat panel read-model, ACP Chat session manager, ACP
  Skills run store, Assistant Workspace host filters, and focused node smoke
  tests.
- No persisted data migration and no changes to ACP transport or transcript
  JSONL formats.
