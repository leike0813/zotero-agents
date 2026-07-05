## Why

Assistant Workspace behavior is stable after explicit handshake and single child
delivery, but the runtime still performs duplicate work. Logs show repeated
shell bridge installation, repeated child ready init publication, repeated
SkillRunner sidebar host attachment, and SkillRunner chrome-only actions going
through the full runtime presentation refresh path.

## What Changes

- Make shell bridge installation idempotent for the current shell frame window.
- Treat duplicate child ready messages as acknowledgements only, not as init
  snapshot publication triggers.
- Make SkillRunner sidebar host attachment idempotent for the current shell
  frame window.
- Publish SkillRunner drawer/chrome changes by re-decorating the latest base
  snapshot instead of refreshing the SkillRunner runtime workspace.
- Keep existing behavior and diagnostics, but remove duplicate work before
  reducing log noise.

## Non-Goals

- Do not change ACP Chat read-model, backend refresh semantics, ACP Skills
  pagination, SkillRunner transcript virtualization, or SkillRunner run state.
- Do not add new subscriptions, `notifyFrontend:false`, listener item-mode
  maps, session index caches, snapshot-path backend refresh, or full snapshot
  JSON signatures.
