# Host Bridge Capability Registry

## Overview

The Host Bridge Capability Registry (`src/modules/hostBridgeCapabilityRegistry.ts`)
is the central registry of all Host Bridge capabilities. It defines what
operations are available through the `/bridge/v1/call` endpoint and the MCP tool
system.

Within the agent-facing architecture, this registry supplies runtime mechanism
facts for the Minimum layer. The generated
`host-bridge.agent-surface.v5` descriptor and CLI mappings expose those facts
as commands, schemas, effects, approvals, handles, recovery, targets, and
operational aliases. Research-task policy and Hermes resident policy are not
registry responsibilities; their ownership and composition are defined in
[Host Bridge Agent-facing Surfaces](host-bridge-agent-surfaces.md).

The registry remains the source for callable Host Bridge capabilities. It does
not select a Generic task, define a Skill workflow, or authorize resident
automation beyond the approval requirement declared for each capability.

---

## Core Types

```typescript
type HostBridgeCapabilityHandler = (
  input: unknown,
  context: HostBridgeCapabilityContext,
) => unknown | Promise<unknown>;

type HostBridgeCapabilityDefinition =
  HostBridgeCapabilityManifestEntry & {
    handler: HostBridgeCapabilityHandler;
  };

type HostBridgeCapabilityContext = {
  getStatus: () => HostBridgeStatusSnapshot;
  connectionMode: "local" | "remote";
  resolveSynthesisClient?: () => SynthesisClient | Promise<SynthesisClient>;
};
```

Each capability pairs a manifest entry (name, category, summary, approval
requirement, input schema) with a callable handler function. The handler
receives the caller's `input` and a `context` object providing access to the
Host Bridge status snapshot, connection mode, and an optional Synthesis client
resolver used by tests. Production resolution uses the cached default client.

---

## Registration: Static Declaration

Capabilities are **not registered dynamically**. They are declared statically
in a module-level `CAPABILITIES` array of `HostBridgeCapabilityDefinition[]`.
Lookup is done through a `Map<string, HostBridgeCapabilityDefinition>` built
from this array at module load time.

Three factory functions build capability definitions:

### `capability(name, category, summary, input, handler)` — General purpose

`approval` is resolved via `getHostBridgeApprovalRequirement(name)`. The
handler is wrapped with `normalizeJsonSafeValue` for JSON-safe output.

### `debugCapability(name, summary, handler)` — Debug-only

Category is fixed to `"debug"`, input mode is `{ type: "object", required: false }`.
The handler wrapper calls `assertDebugModeEnabled()` before execution, throwing
when debug mode is off.

### `synthesisCapability(name, category, summary, invoke)` — Synthesis-backed

The handler resolves a grouped `SynthesisClient` from
`context.resolveSynthesisClient()` or `getDefaultSynthesisClient()`, rebuilds
the input as a JSON object, and invokes an explicit domain lambda. Topic
Context and filtered artifact export also receive an environment-neutral
delivery context derived from the Host Bridge connection mode. The embedded
MCP server derives both its tool list and dispatch handlers from this same
capability registry; it has no separate tool registry or Synthesis service
dispatcher.

---

## Capability Categories

| Category | Count | Capabilities |
|----------|-------|-------------|
| `context` | 2 | `get_current_view`, `get_selected_items` |
| `library` | 8 | `search_items`, `list_items`, `get_item_detail`, `get_item_notes`, `get_note_detail`, `list_note_payloads`, `get_note_payload`, `get_item_attachments` |
| `mutation` | 2 | `preview`, `execute` |
| `diagnostic` | 1 | `get_status` |
| `topics` | 4 | `list`, `get_context`, `get_report`, `get_review_input` |
| `schemas` | 1 | `get` |
| `concepts` | 1 | `query` |
| `citation_graph` | 7 | `query_cluster`, `get_overview`, `get_slice`, `get_metrics`, `rank_external_references`, `rank_library_papers`, `refresh_metrics` |
| `paper_artifacts` | 4 | `get_manifest`, `read`, `export_filtered`, `resolve_topic_digest` |
| `insights` | 1 | `get_attention_queue` |
| `resolvers` | 1 | `resolve` |
| `reference_index` | 1 | `get` |
| `library_index` | 1 | `get` |
| `debug` | 12 | `status`, `persistence.snapshot`, `tasks.snapshot`, `acpSkillRun.reapplyResult`, `zotero.eval`, 7 synthesis debug helpers |

---

## Lookup

```typescript
function listHostBridgeCapabilities(): HostBridgeCapabilityManifestEntry[]
```

Returns manifest entries for all non-debug capabilities (debug capabilities are
filtered out when debug mode is disabled).

```typescript
function getHostBridgeCapability(
  name: string,
): HostBridgeCapabilityDefinition | null
```

Looks up a capability by name. Returns `null` when:
- The name is not registered.
- The capability is a `debug` category capability and debug mode is disabled.

```typescript
function getHostBridgeCapabilityApproval(
  name: string,
): HostBridgeApprovalRequirement
```

Returns the `approval` requirement for a named capability. Returns
`"zotero-ui-required"` when the capability is not found.
