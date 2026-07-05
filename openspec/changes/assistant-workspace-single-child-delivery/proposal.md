## Why

Assistant Workspace now uses an explicit shell handshake and cached child
replay, but SkillRunner still has older sidebar-only bypass handling inside the
workspace shell. That bypass can deliver the same SkillRunner payload directly
while the unified replay path also delivers it, causing visible flicker.

## What Changes

- Route all child snapshots through `assistant-workspace:child-snapshot`.
- Remove Assistant Workspace shell consumption of SkillRunner snapshot messages
  outside the unified child-snapshot envelope.
- Remove the shell-side `run-dialog:action` ready fallback from workspace mode.
- Add guarded child replay so the same cached payload generation is delivered
  at most once to the same child frame window.
- Keep retry behavior for missing child frames, but retry only failed or
  pending deliveries.

## Non-Goals

- Do not change ACP Chat read-model, backend refresh, ACP Skills pagination,
  SkillRunner transcript rendering, or SkillRunner business state.
- Do not remove standalone SkillRunner dialog support from `run-dialog.js`.
- Do not add new subscriptions, `notifyFrontend:false`, listener item-mode
  maps, session index caches, snapshot-path backend refresh, or full snapshot
  JSON signatures.
