# Host Bridge Capability Registry

## Overview

The executable capability contract
(`contracts/host-bridge/capabilities.v2.json`) is the single metadata owner for
all Host Bridge capabilities. It defines each capability's input and output
JSON Schemas, category, summary, effect, approval requirement, exposure, and
response-sizing policy. The Host Bridge Capability Registry
(`src/modules/hostBridgeCapabilityRegistry.ts`) binds private TypeScript
handlers to those canonical IDs for `/bridge/v2/call` and the MCP tool system.

Within the agent-facing architecture, the executable contract supplies runtime
mechanism facts for the Minimum layer. The generated
`host-bridge.agent-surface.v6` descriptor and CLI mappings expose those facts
as commands, schemas, effects, approvals, handles, recovery, targets, and
operational aliases. Research-task policy and Hermes resident policy are not
registry responsibilities; their ownership and composition are defined in
[Host Bridge Agent-facing Surfaces](host-bridge-agent-surfaces.md).

The registry remains the implementation owner for callable behavior only. It
does not redeclare contract metadata, select a Generic task, define a Skill
workflow, or authorize resident automation beyond the effective approval
policy derived from the capability contract.

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
  connectionMode: HostBridgeConnectionMode;
  resolveZoteroHostCapabilityBroker?: () => ZoteroHostCapabilityBroker;
  resolveSynthesisClient?: () => SynthesisClient | Promise<SynthesisClient>;
  resolveDirectResearchBundleApplication?: () =>
    | DirectResearchBundleApplication
    | Promise<DirectResearchBundleApplication>;
};
```

Each capability pairs a manifest entry (name, category, summary, approval
requirement, input schema) with a callable handler function. The handler
receives the caller's `input` and a `context` object providing access to the
Host Bridge status snapshot, connection mode, and an optional Synthesis client
resolver used by tests. Production resolution uses the cached default client.

Zotero capability handlers resolve the canonical broker directly. The registry
does not depend on `WorkflowHostApi`, and MCP calls the same handlers instead of
maintaining a second tool implementation. The registry also owns the remote
attachment projection: library reads and mutation results both remove local
paths before returning opaque Host Bridge file handles.

---

## Registration: Static Declaration

Capabilities are **not registered dynamically**. Private handler bindings are
declared statically in a module-level `CAPABILITIES` array and indexed by ID.
At module initialization, the registry compares the complete handler ID set
with the complete canonical contract ID set. Missing handlers, orphan handlers,
or duplicate handler IDs prevent the module from loading.

Three factory functions bind implementations without owning metadata:

### `capability(name, handler)` — General purpose

The factory requires a matching canonical contract entry, copies its manifest
metadata, resolves the current effective approval requirement, and attaches the
handler. A missing contract entry is a startup error.

### `debugCapability(name, handler)` — Debug-only

The canonical entry still owns category and schemas. The wrapper adds only the
runtime debug-mode availability check before invoking the handler.

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

<!-- host-bridge-surface:capability-categories:start -->
| Category | Count | Capabilities |
| --- | --- | --- |
| `citation_graph` | 9 | `citation_graph.get_layout`, `citation_graph.get_metrics`, `citation_graph.get_overview`, `citation_graph.get_slice`, `citation_graph.query_cluster`, `citation_graph.rank_external_references`, `citation_graph.rank_library_papers`, `citation_graph.refresh_metrics`, `citation_graph.update` |
| `concepts` | 1 | `concepts.query` |
| `context` | 9 | `context.get_current_view`, `context.get_selected_items`, `navigation.focus_zotero`, `navigation.open_item`, `navigation.open_reader_location`, `navigation.reveal_items`, `navigation.select_collection`, `navigation.select_library_view`, `navigation.select_saved_search` |
| `debug` | 14 | `debug.acpSkillRun.reapplyResult`, `debug.persistence.snapshot`, `debug.skillrunner.connections.snapshot`, `debug.status`, `debug.synthesis.cache.list`, `debug.synthesis.cleanInstallReset`, `debug.synthesis.diff`, `debug.synthesis.operations.list`, `debug.synthesis.paper.inspect`, `debug.synthesis.profiler.list`, `debug.synthesis.snapshot`, `debug.synthesis.topic.inspect`, `debug.tasks.snapshot`, `debug.zotero.eval` |
| `diagnostic` | 2 | `diagnostic.get_status`, `synthesis.operation.get` |
| `insights` | 1 | `insights.get_attention_queue` |
| `items` | 1 | `items.export_research_bundle` |
| `library` | 14 | `library.export_annotations`, `library.get_item_attachments`, `library.get_item_detail`, `library.get_item_notes`, `library.get_note_detail`, `library.get_note_payload`, `library.list_annotations`, `library.list_items`, `library.list_note_payloads`, `library.list_saved_searches`, `library.readiness_audit`, `library.search_items`, `library.sync_snapshot`, `synthesis.search_evidence` |
| `library_index` | 1 | `library_index.get` |
| `mutation` | 31 | `attachments.create`, `attachments.move`, `attachments.remove`, `attachments.replaceFile`, `attachments.updateMetadata`, `collection.create`, `collection.remove`, `collection.update`, `collection.updateMembership`, `item.addRelated`, `item.changeType`, `item.create`, `item.remove`, `item.removeRelated`, `item.updateMetadata`, `item.updateTags`, `literature.ingest`, `literature_artifact.upsert_citation_analysis`, `literature_artifact.upsert_digest`, `literature_artifact.upsert_references`, `literature_artifact.upsert_score`, `managed_note.write_conversation`, `managed_note.write_custom`, `mutation.get_operation`, `notes.create`, `notes.remove`, `notes.updateContent`, `notes.upsertPayload`, `statusTags.transition`, `trash.setItemsState`, `workflow_products.remove` |
| `paper_artifacts` | 4 | `paper_artifacts.export_filtered`, `paper_artifacts.get_manifest`, `paper_artifacts.read`, `paper_artifacts.resolve_topic_digest` |
| `reference_index` | 2 | `reference_index.get`, `reference_sidecar.refresh` |
| `resolvers` | 1 | `resolvers.resolve` |
| `schemas` | 1 | `schemas.get` |
| `topics` | 8 | `topics.export_research_bundle`, `topics.find_by_paper_ref`, `topics.get_context`, `topics.get_planning_context`, `topics.get_report`, `topics.get_review_input`, `topics.list`, `topics.search` |
| `workflow_products` | 4 | `workflow_products.export`, `workflow_products.get`, `workflow_products.list`, `workflow_products.read_asset` |
<!-- host-bridge-surface:capability-categories:end -->

The renderer derives this complete inventory and every count from
`capabilities.v2.json`; generated surfaces do not reconstruct it from prose.

Library enumeration capabilities `library.list_items` and
`library.readiness_audit` use the optional `filter` field for literal,
field-independent matching under Zotero SQLite `NOCASE` semantics. Empty or
whitespace-only values omit the predicate; wildcard characters remain literal.
Their pages preserve stable identity ordering and opaque continuation.
`library.search_items` keeps the existing capability name and accepts the C2
bounded lexical search request, including portable Library scope, source kinds,
page bounds, and opaque continuation. Its handler calls
`ZoteroHostCapabilityBroker.library.searchItems` directly and returns the
shared search envelope (`results`, `status`, `method`, `coverage`, `issues`,
`nextCursor`, `hasMore`, and `total`). Each result contains a regular item
summary and source matches with version, location, matched terms, and phrase
match; the response exposes neither score nor local path. Broker cursor and
source-basis errors remain structured and do not restart the query. The MCP
tool mirrors the same request and result. The CLI `--query` JSON container
remains unchanged. Snapshot capture stays fixed-set and unfiltered, and the
Synthesis reverse-host metadata page port does not take `filter` or search
`query`.

`topics.search` is a read capability in the `topics` category. It accepts the
shared bounded Topic search request — a required `query`, optional canonical
`sections`, the common `limit`, `maxResults`, and `cursor` bounds — and its
handler calls `SynthesisClient.topics.search`, so the Synthesis Topic
application stays the search owner. Bridge holds no local ranking and never
searches `topics.list` results. The result is the shared search envelope with
`method: lexical` and `coverage: { kind: "topic", sections: [...] }`; each
result is one Topic with its identity, matched canonical sections, and concise
match reasons. No relevance score, local path, or inferred freshness is
exposed. An invalid request is rejected by the capability contract before the
Topic application runs. A rejected search round surfaces as the typed
`synthesis_search_cursor_rejected` error with the owning `reasonCode` and
`retryable: false`; that mapping is scoped to the bounded read search
capabilities, so Synthesis maintenance conflicts keep their own existing code
and message. The MCP tool mirrors the same request and result, and the CLI
exposes it as `synthesis topic search` through the unchanged `--query` JSON
container.

---

## Lookup

```typescript
function listHostBridgeCapabilities(): HostBridgeCapabilityManifestEntry[]
```

Returns manifest entries for all non-debug capabilities (debug capabilities are
filtered out when debug mode is disabled). Handler functions are never exposed.

```typescript
function getHostBridgeCapability(
  name: string,
): HostBridgeCapabilityDefinition | null
```

Looks up a capability by name. Returns `null` when:
- The name is not registered.
- The capability is a `debug` category capability and debug mode is disabled.
- The SkillRunner connection audit capability is unavailable in the current
  build or runtime.

```typescript
function getHostBridgeCapabilityApproval(
  name: string,
): HostBridgeApprovalRequirement
```

Returns the `approval` requirement for a named capability. Returns
`"zotero-ui-required"` when the capability is not found.

```typescript
async function executeHostBridgeCapability(
  name: string,
  input: unknown,
  context: HostBridgeCapabilityContext,
): Promise<JsonSerializableValue | null>
```

Execution validates input against the canonical Draft 2020-12 schema before
calling the handler, then validates handler output before returning success.
Input failures use `invalid_capability_input`; implementation/contract output
drift uses `capability_output_contract_violation`. Both carry bounded,
redacted, structured violations. Permission evaluation in HTTP and MCP paths
occurs only after input validation, so malformed write requests cannot trigger
approval UI.
