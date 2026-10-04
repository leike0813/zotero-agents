# Proposal

## Why

Issue #88 fixes separate enumeration and search contracts for v0.9.0. The current list, traversal and readiness APIs call their deterministic literal filter `query`, obscuring that distinction and propagating the ambiguity into Workflow, Bridge, MCP and CLI guidance.

## What Changes

- **BREAKING**: rename the optional text criterion on library list, traversal and readiness from `query` to `filter`, including resolved `criteria` and `filters` DTOs, validation diagnostics and executable schemas.
- Preserve field-independent literal matching, stable identity order, complete traversal, current-condition counts, source-side pagination, cancellation and snapshot capture.
- Adapt the existing Bridge `library.search_items` request's `query` explicitly into the renamed list filter until the independent lexical item-search change replaces its implementation. Its current input and `{ items, truncated }` result remain unchanged in this change.
- Check every consumer, including dynamically assembled built-in workflow requests, skill source/materialization, MCP aliases, CLI contracts and tests. Preserve the CLI JSON-container flag `--query`.
- Repair confirmed built-in consumer DTO drift: collection-collector scopes membership reads with portable `collectionRef`, and tag-auditor takes the resolved library identity from list `criteria.libraryId`. Verify these consumers through actual Workflow Host/Broker reads.
- Update component documentation and governed surface field facts without deleting or thinning semantic instructions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-broker-capability-api`: list criterion is `filter`; content search may have an independent member in its own change.
- `zotero-library-keyset-pagination`: the normalized literal criterion and cursor basis use `filter`.
- `workflow-host-api-v12`: named list/traversal projections accept and echo the canonical criterion.
- `host-bridge-service`: list/readiness wire contracts use `filter`, with an explicit retained search adapter.

## Impact

First of four changes, followed by `add-synthesis-lexical-evidence-search`, `add-library-lexical-item-search`, and `add-topic-lexical-search`. This change has no implementation dependency on the other three. All four planning sets must be apply-ready before this change is applied; execution then stops after this change. No dependency installation, branch switch, commit, publication, native prebuild or archive is included.

Affected owners are `src/workflows/types.ts`, `src/modules/zoteroHostCapabilityBroker.ts`, `src/modules/zoteroHost/zoteroLibraryPageQuery.ts`, `src/modules/hostBridgeCapabilityRegistry.ts`, and the canonical Host Bridge contract. Existing explicit Workflow/MCP projections, Rust CLI input handling, built-in packages, related tests and generated guidance are audited and changed where they consume this criterion or the confirmed canonical page fields above.
