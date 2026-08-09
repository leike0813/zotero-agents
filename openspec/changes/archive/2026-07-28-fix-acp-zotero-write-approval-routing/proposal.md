## Why

ACP Chat currently stores its conversation-specific Host Bridge scope in a shared workspace profile, so connecting another conversation can redirect a Zotero write approval away from the invoking conversation. The permission state also loses or leaves stale cards when requests overlap or clear, and Host Bridge writes are projected as generic ACP tool approvals in both ACP Chat and ACP Skills.

## What Changes

- Bind each ACP Chat adapter to its conversation through `ZOTERO_BRIDGE_SCOPE`, while keeping the shared profile owner-neutral.
- Serialize pending approvals per ACP Chat conversation and ACP Skills run, correlate every action by request ID, and cancel every unresolved request on owner teardown.
- Publish every permission transition, including an explicit empty permission region after resolution or cancellation.
- Carry an explicit internal approval kind so Host Bridge and embedded Zotero MCP writes project as Zotero write approvals without overloading their source identifiers.
- Add regression coverage for multi-conversation routing, overlapping approvals, stale actions, permission clearing, shared projection, and managed-region DOM identity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-session-management`: ACP Chat scopes Host Bridge calls by adapter environment and serializes all pending approvals per conversation.
- `acp-skills-interactive-execution`: ACP Skills preserves and presents overlapping approval requests without hiding unresolved work.
- `assistant-workspace-publication-data-plane`: Permission publications carry the correct approval kind and explicitly publish cleared state.
- `host-bridge-approval-prompts`: Scoped Host Bridge writes remain attached to the invoking ACP owner and render as Zotero write approvals.

## Impact

The change affects ACP Chat adapter preparation, Host Bridge CLI injection, ACP Chat and ACP Skills pending-permission state, permission persistence/projection, and focused core/UI tests. It does not change the Assistant Workspace v1 wire schema, transcript storage, ACP Skills workspace layout, dependencies, or any governed Host Bridge agent-facing surface.
