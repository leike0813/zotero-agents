## Context

ACP Chat prepares one shared agent workspace for all conversations. Host Bridge CLI materialization currently writes the active conversation scope into that workspace's shared profile, so a later adapter preparation changes the scope observed by an earlier adapter. The CLI already gives `ZOTERO_BRIDGE_SCOPE` precedence over `profile.scope`, and each ACP adapter receives an independent backend environment.

ACP Chat also stores one pending resolver and one visible request. ACP Skills stores resolvers by request ID but still projects one replaceable visible request. The shared Assistant Workspace projection derives approval kind from the request source and Chat publication only invalidates the permission region while a request remains non-null.

## Goals / Non-Goals

**Goals:**

- Keep Host Bridge scope stable for the lifetime of each ACP Chat adapter.
- Preserve and settle every overlapping approval request in FIFO order.
- Correlate approval actions with the exact active request and owner.
- Publish both populated and cleared permission states.
- Classify Host Bridge and embedded Zotero MCP writes consistently in Chat and Skills.
- Preserve managed-region DOM identity outside the permission-related regions.

**Non-Goals:**

- Changing the Assistant Workspace v1 wire contract.
- Changing ACP tool auto-approval or Host Bridge write-grant policy.
- Moving ACP Skills profiles or changing transcript persistence.
- Editing governed Host Bridge agent-facing surfaces or publishing a release.

## Decisions

### ACP Chat scope is environment-owned

`materializeHostBridgeCliRunInjection` will emit `ZOTERO_BRIDGE_SCOPE` for `acp-chat` and omit owner scope from the shared profile. The scope JSON contains the conversation ID as both `requestId` and `runId`. The existing backend-environment merge creates a separate environment for each adapter, so later preparations cannot alter an earlier adapter's routing identity.

This is preferred to per-conversation profile directories because endpoint, token lookup, shims, and guidance are workspace-stable. Only the owner identity needs isolation, and the CLI already defines the environment variable as the higher-precedence route.

ACP Skills retains its per-run profile behavior because its workspace is already owner-scoped.

### One queue implementation governs both surfaces

A pure TypeScript permission queue will own ordered entries and resolver settlement. ACP Chat keeps one queue in each session runtime; ACP Skills keeps one queue per run request ID. The queue exposes enqueue, active entry lookup, exact active resolution, and drain operations.

The visible snapshot/record remains a single request and always mirrors the queue head. Duplicate incoming request IDs are cancelled instead of replacing or leaking an existing entry. An action for a stale or non-head ID never resolves another request.

### Permission transitions are explicit

Every Chat queue transition emits the `permission` change kind. Resolving the last entry therefore publishes `{ request: null }`; promoting another entry publishes that entry in the same owner lane. Existing region signatures continue to suppress unrelated DOM reconstruction.

Skills run updates already invalidate the permission region, so queue-head changes continue through the existing run publication path.

### Approval kind is explicit internal state

`AcpPendingPermissionRequest` gains optional `approvalKind`. ACP tool requests set `acp-tool`; embedded MCP and Host Bridge write requests set `zotero-write`. The projector prefers this field and falls back to legacy source inference for persisted records created before the change. The canonical wire DTO already contains the same two-value field, so no wire migration is needed.

## Risks / Trade-offs

- **A backend issues many approvals without waiting** → FIFO retains all requests, while teardown drains every resolver to prevent leaks.
- **An old persisted visible request has no live resolver** → existing stale-request recovery clears it; legacy source fallback preserves its display classification.
- **A caller sends a stale action after head promotion** → exact request-ID validation rejects it without touching the new head.
- **Shared profile still contains stale scope from an older plugin version** → successful ACP Chat materialization rewrites it without owner scope before starting the adapter.
- **Permission updates accidentally rebuild high-frequency UI regions** → focused DOM identity tests cover transcript and unrelated managed regions.
