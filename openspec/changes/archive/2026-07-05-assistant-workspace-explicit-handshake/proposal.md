## Why

Assistant Workspace shell and child panel initialization currently depends on
single-fire load and ready events. In Zotero's embedded browser environment,
those events can arrive before the host bridge is installed or before the host
has committed an active target. When that happens, shell ready and child ready
are lost, leaving ACP Chat, ACP Skills, and SkillRunner in a half-initialized
static shell until a later unrelated event happens to repost enough state.

## What Changes

- Make Assistant Workspace shell readiness retryable and idempotent.
- Add a host-side shell handshake loop that sends lightweight workspace init
  messages until shell ready is acknowledged.
- Make shell-side ready reporting retry when direct host bridge delivery is not
  acknowledged.
- Replay cached child init/snapshot payloads until the target child frame can
  receive them, without fabricating child ready events.
- Add DEBUG diagnostics for handshake schedule/tick/post/ack/duplicate/drop and
  child replay attempts.

## Non-Goals

- Do not change ACP Chat read-model, transcript pagination, or backend refresh
  semantics.
- Do not add ACP Chat-specific initialization patches.
- Do not add new subscriptions, `notifyFrontend:false`, listener item-mode
  maps, session index caches, snapshot-path backend refresh, or full snapshot
  JSON signatures.
