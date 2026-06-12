# Host Bridge Capability Registry

## Overview

The Host Bridge Capability Registry (`src/modules/hostBridgeCapabilityRegistry.ts`)
is the central registry of all Host Bridge capabilities. It defines what
operations are available through the `/bridge/v1/call` endpoint and the MCP tool
system.

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
  resolveSynthesisService?: () => SynthesisMcpService;
};
```

Each capability pairs a manifest entry (name, category, summary, approval
requirement, input schema) with a callable handler function. The handler
receives the caller's `input` and a `context` object providing access to the
Host Bridge status snapshot and (optionally) the Synthesis MCP service.

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

### `synthesisCapability(name, category, summary, methodName)` — Synthesis-backed

The handler resolves the Synthesis service from `context.resolveSynthesisService()`
(or falls back to `getDefaultSynthesisService()`), then calls `methodName` on
the resolved service with the input.

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
