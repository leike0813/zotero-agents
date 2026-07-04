## Why

ACP Chat transcript state is file-backed, but the current UI snapshot read path
can still clone and publish complete transcript item arrays. That prevents the
next pagination step from being narrow: the host still pays full transcript
snapshot cost before the child has a page-based renderer.

This change adds an explicit structural snapshot read mode so host code can ask
for panel structure without complete transcript content.

## What Changes

- Add an ACP Chat UI snapshot read option for transcript item mode.
- Keep the default full snapshot behavior unchanged.
- Define structural ACP Chat items as plan-only transcript structure for this
  change.
- Ensure structural publish mode does not retain message, thought, or tool
  transcript items in the published UI snapshot.

## Non-goals

- Do not connect ACP Chat child rendering to transcript pages.
- Do not add or route `load-transcript-page` actions.
- Do not change frontend or conversation subscription semantics.
- Do not add listener `itemMode` maps, session index caches, or a second UI
  refresh subscription.
- Do not use `notifyFrontend: false` as a UI delivery model.

## Impact

- `src/modules/acpSessionManager.ts`
- `test/core/96-acp-session-manager.test.ts`
- `openspec/specs/acp-chat-file-backed-transcript-state/spec.md`
