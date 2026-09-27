## Why

Several Zotero readers hydrate complete child collections before adapters paginate them, while MCP serializes entire tool calls and cannot protect other Broker callers. Issue #39 requires one source-bounded read contract and process-wide short Host slices before its selection, mutation, artifact, and navigation changes.

## What Changes

- **BREAKING**: Replace ordinary collection, note, payload, attachment, and annotation array/offset reads with Broker-owned source pages; remove ordinary legacy read projections and adapter repagination.
- Add portable Saved Search discovery explicitly to Broker, Workflow V12, Host Bridge, MCP, and CLI.
- Propagate trusted call cancellation and serialize only bounded native slices across Broker instances; preserve snapshot and traversal completion semantics.
- **BREAKING**: Replace MCP whole-tool FIFO with nine concurrent inflight admissions, retaining timeout, circuit breaker, and watchdog protection.
- **BREAKING**: Ordinary read pages fail as a whole on target read failure; payload candidate scans may have an unknown total and an empty nonterminal page.
- Migrate direct and result consumers, executable contracts, documentation, generated guidance, and the ownership review mirror together.

## Capabilities

### New Capabilities

None; Saved Search discovery extends the existing Broker and transport contracts.

### Modified Capabilities

- `zotero-host-broker-capability-api`: source pages, Saved Search refs, bounded read controls, and process Host gate.
- `zotero-mcp-concurrency-queue-policy`: nine inflight admissions instead of whole-tool serialization.
- `zotero-mcp-guard-watchdog`: cancellation, inflight diagnostics, and whole-page failure.
- `zotero-mcp-host-bridge-capability-catalog`: canonical read mirror and trusted control forwarding.
- `host-bridge-service`: direct canonical read resolution and discovery.
- `host-bridge-output-boundaries`: source continuations, unknown payload totals, and safe errors.
- `host-bridge-file-downloads`: page-local attachment locality projection.
- `workflow-host-api-v12`: explicit Saved Search member, read page signatures, and consumer cancellation.
- `host-bridge-cli-interface`: Saved Search command and canonical read result contracts.
- `zotero-library-full-snapshot-feed`: short capture/delivery slices preserving fixed-basis completeness.

## Impact

Implementation and governance baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. The untracked implementation guide is user-owned input. This is the first of five independently verified changes, with no change to exact selection/current-view semantics, mutation identities, Managed Note schemas, navigation, Pi, dependencies, Git history, or publication. Remaining shared context/navigation legacy callers belong to their subsequent changes. Production plugin code must remain compatible with Zotero 7.0.32, 9.0.6, and 10.0.1.
