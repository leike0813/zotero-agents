## Why

Research Bundle materialization, graph import, archive handling, and resource publication currently require callers to understand multiple lower-level capabilities and lifecycle details. V12 needs deep research-product modules that own graph correctness, partial success, paths, staging, and publication behind small explicit interfaces.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`; this change depends on `01-establish-workflow-host-v12-contract-foundation` and `02-deepen-workflow-host-runtime-adaptation-v12`.

Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§12.13–12.19, 13, 17, 18, and 19. The architecture record is authoritative for graph import consistency, explicit target mapping, partial success, resource lifetimes, filesystem/archive boundaries, budgets, compensation, and recovery semantics summarized here.

## What Changes

- Deepen Research Bundle materialization and add graph-aware `importPapers` with explicit target mapping, SCC consistency groups, dependency scheduling, late relation binding, partial success, receipts, attempts, cancellation, and compensation.
- Deepen the `file`, `archive`, and `resources` modules with bounded, run-scoped, trusted in-process path and callback semantics.
- Route all ordinary file work through the completed runtime-persistence seam while keeping archive-native ZIP operations owner-private.
- Make materialized paper resources immutable and run-scoped; do not return live attachment paths as resource identity.
- Migrate built-in literature-workbench and MinerU bundle/import/export consumers to the deep modules.
- Preserve workflow-format and manifest policy in workflows while moving Zotero graph-write orchestration into the Research Bundle owner.
- Reject heuristic DOI/title/hash target matching and process-restart resume.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-bundle-workflow`: Add bounded materialization and graph-import behavior with explicit partial-success and recovery semantics.
- `research-bundle-readable-product`: Make materialized paper sources and resources portable, complete, and auditable.
- `direct-research-bundle-export`: Reuse the deep materializer and archive/resource owners without changing direct-export selection semantics.
- `workflow-resource-bindings`: Require run-scoped opaque inputs/outputs, allocation, publication, and cleanup.
- `workflow-product-storage`: Align product staging and publication with the v12 file/archive/resources ownership model.

## Impact

- Research Bundle owner, Workflow file/archive/resource modules, Host Bridge resources, Synthesis client adapter, canonical contracts, literature-workbench package, MinerU hooks, and related tests.
- No local path in remote or durable identity, no sequential low-level import facade, no implicit target mutation, no persistent resume protocol, dependency change, or release action.
