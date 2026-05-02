# Design

## Bridge Model

The Assistant shell owns the only host-facing bridge:

- Host injects `__zsAssistantWorkspaceBridge` into the shell frame direct window and `wrappedJSObject`.
- Shell sends all user actions to host through this bridge first.
- Shell falls back to `parent/top/opener.postMessage` only for standalone or legacy contexts.

Each child tab keeps its existing child-facing bridge:

- SkillRunner: `__zsSkillRunnerSidebarBridge`
- ACP Chat: `__zsAcpSidebarBridge`
- ACP Skills: `__zsAcpSkillRunSidebarBridge`

The shell installs these child bridges on iframe load, tab activation, and snapshot replay.

## Action Envelope

All shell-to-host child actions include:

- `tab`
- `action`
- `payload`
- `actionId`
- `ts`

The host returns an action result object for bridge calls:

- `{ ok: true, actionId }`
- `{ ok: false, actionId, error }`

The shell records recent action traces for diagnostics.

## Boundaries

The shell may route messages and replay snapshots. It must not mutate child page business UI or state directly. Existing SkillRunner, ACP Chat, and ACP Skills handlers remain the source of truth for action semantics.
