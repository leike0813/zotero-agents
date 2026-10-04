# Proposal

## Why

`library.search_items` currently behaves as a bounded list-page wrapper, so it cannot provide the agreed lexical relevance, source coverage, or stable search continuation contract. Library item search needs a real lexical path owned by the Zotero Host Capability Broker while preserving the established Bridge, MCP, and CLI entry points.

## What Changes

- Add a Broker-owned `library.searchItems` request and result contract and explicitly project it as `host.library.searchItems` in Workflow Host v12. The contract uses a required non-empty string query, bounded `limit` and `maxResults`, opaque continuation, explicit Library scope, truthful lexical method and coverage, and no public score.
- Search metadata and abstracts, existing Markdown full text, and canonical digest/analysis content within the selected Library scope. Apply `itemRefs`, collection, tag, and item-type constraints as an intersection; empty explicit scopes return no results. Do not include ordinary notes, annotations, conversation content, or Topic content, and do not trigger OCR.
- Return each item as `{ item: RegularItemSummaryDto, matches }`, with source, opaque source version, source location, matched terms, and phrase-match fact; aggregate by complete item identity with deterministic relevance ordering and no score or local path. Reuse C2's `SynthesisSearchRequest`, `SynthesisLibrarySearchScope`, library coverage and closed issue DTOs. Freeze query, scope, ordering, lexical method, source versions, and bounded result set in continuation state; reject stale or expired continuation without rerunning the query.
- Replace the existing `library.search_items` Bridge behavior with the Broker result contract and carry it through existing MCP and CLI projections while preserving the CLI `--query` JSON container.
- Reuse Synthesis lexical execution only through a private native-composition injection port owned by the Broker integration. Keep search policy, scope, result aggregation, and public semantics in the Broker; do not add `SynthesisClient.searchItems` or copy the lexical implementation.
- Update the exact Workflow Host v12 manifest and explicit composition owners so Broker capability growth does not implicitly widen the workflow surface.
- Keep the list/filter split and list snapshot behavior in the separate `separate-library-list-filters` change; this change consumes that contract and does not alter snapshot semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-broker-capability-api`: define Broker-owned lexical item search separately from complete list and traversal behavior.
- `workflow-host-api-v12`: explicitly add the `host.library.searchItems` projection with the Broker request/result DTOs and call control.
- `host-bridge-service`: route `library.search_items` to the canonical Broker search result without reducing it to a list page.
- `host-bridge-cli-interface`: preserve the library item search command while aligning its result and continuation semantics with the capability contract.
- `zotero-mcp-tool-suite`: expose the Broker search contract through the existing JSON-safe MCP mirror.

## Impact

Implementation is expected to touch `src/workflows/types.ts`, `src/workflows/hostApi.ts`, `src/workflows/workflowHostOwners.ts`, `src/workflows/workflowHostContract.ts`, `src/modules/zoteroHostCapabilityBroker.ts`, `src/modules/hostBridgeCapabilityRegistry.ts`, the private Synthesis native composition/search injection seam, `contracts/host-bridge/capabilities.v2.json`, `contracts/host-bridge/cli-commands.v2.json`, and the Rust CLI argument/response adapter. Existing broker, Workflow Host contract, Host Bridge, MCP, CLI, and native composition behavior tests will be extended for scope, lexical output, continuation, explicit projection, and fail-closed behavior. No public Synthesis client operation or Topic API is added. Host Bridge agent-facing semantic sources are outside this change's edit scope.
