## Why

ACP Chat selected transcript page rendering exposed a real publication loop:
ordinary ACP Chat snapshot posts refresh backends, backend refresh notifies
frontend listeners, and the assistant workspace schedules another ordinary
snapshot. Once the snapshot build became asynchronous, that loop could cancel
fresh builds repeatedly and leave the panel blank or unable to switch sessions.

ACP Chat should follow the ACP Skills pattern: typed changes drive filtered
panel publication, and panel snapshot preparation reads only the selected
conversation model. Backend refresh must be limited to explicit lifecycle
boundaries instead of living inside the ordinary snapshot path.

## What Changes

- Add an ACP Chat panel read-model that prepares structural panel snapshots and
  optional selected transcript pages without refreshing backends.
- Add typed ACP Chat panel snapshot changes and a filtered subscription path for
  assistant workspace publication.
- Replace ordinary ACP Chat sidebar snapshot posting with no-refresh panel
  snapshot posting.
- Keep backend refresh at explicit shell/open/tab-ready and backend-selection
  boundaries.

## Non-goals

- Do not rewrite ACP Chat backend registry, conversation CRUD, streaming event
  handling, or JSONL persistence.
- Do not add listener `itemMode` maps, session index caches, or
  `notifyFrontend: false` delivery.
- Do not limit the shared frontend snapshot subscription to ACP Chat.
- Do not change ACP Skills or SkillRunner refresh semantics.

## Impact

- `src/modules/acpChatPanelReadModel.ts`
- `src/modules/acpSessionManager.ts`
- `src/modules/assistantWorkspaceSidebar.ts`
- `test/core/96-acp-session-manager.test.ts`
- `test/core/97-acp-ui-smoke.test.ts`
- `openspec/specs/acp-chat-file-backed-transcript-state/spec.md`
