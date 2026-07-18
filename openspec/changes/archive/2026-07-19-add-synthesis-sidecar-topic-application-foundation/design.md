## Context

The plugin still owns the complete Topic apply method inside a large composition service. The sidecar now has two isolated owners: a three-table repository and a complete canonical shadow store. The latter can validate and promote an already assembled snapshot, but it cannot return that snapshot to an application use case and the sidecar has no Topic registry or derived projection state.

The existing workflow client already materializes every referenced workspace artifact into bounded JSON/text assets. That is the correct environment-neutral input boundary; carrying workspace paths, readers, or Zotero objects into the application would reverse the dependency direction. The current runtime also intentionally retired Zotero Topic mirror behavior, despite older Stage 1 planning text that still describes it.

## Goals / Non-Goals

**Goals:**

- Own strict Topic list, detail, and apply orchestration in `packages/synthesis-application`.
- Preserve existing create, full update, structured patch, canonical hash, and optimistic conflict semantics.
- Run the use case against persistent isolated Node roots and retain useful derived Topic Graph, Concept, discovery, and operation state across restart.
- Make plugin and Node fixture composition reuse bundle validation and optimistic apply decisions without changing production persistence.

**Non-Goals:**

- Routing production `SynthesisClient`, Workflow Host, Workbench, Host Bridge, or MCP calls to the sidecar.
- Adding an HTTP apply/upload protocol, managed assets, delete/purge/archive, Topic Report export, Host effects, WebDAV, or production migration.
- Reintroducing Zotero Topic mirror data or performing WS7 single-writer cutover.

## Decisions

### Accept materialized assets, never workspace authority

The strict apply request contains the result bundle and a bounded array of `{id, mediaType, text}` assets. The application builds an immutable asset map and resolves only relative IDs declared by the bundle or manifests. Unknown fields, duplicate IDs, traversal, absolute/URL paths, unsupported media types, per-asset overflow, aggregate overflow, and missing referenced assets fail before an operation or canonical write.

This reuses the existing Workflow Host materialization boundary instead of teaching Node about workflow directories or adding a second file-transfer design. No network capability is added because the existing 50 MiB aggregate request cannot fit the general RPC limit; a paged production upload belongs to a later routing change.

### Add one deep Topic application module over narrow ports

`createSynthesisTopicApplication` owns request rebuilding, bundle validation, asset resolution, complete/patch assembly, canonical snapshot construction, list/detail projection, operation phases, and post-commit projection orchestration. It depends on the structured-artifact engine, canonical store, and a Topic application state repository port. It imports no Node, Zotero, Host, UI, plugin service, or workflow runtime module.

Plugin compatibility imports the shared bundle validation and optimistic decision module rather than copying those helpers. The production apply/list/detail composition remains plugin-owned in this change because its historical metadata hash is computed over envelope data before wrapping, whereas the strict shadow store correctly hashes and validates the complete envelope. Routing old current through the strict application would therefore change production hashes and is deferred to the explicit production migration/cutover design.

### Keep complete canonical reads internal

The canonical store gains `readCurrent({topicId})`, returning `absent|ready|invalid` plus a complete snapshot only for in-process application callers. The Node adapter performs the same strict validation and symlink/unknown-file checks as inspect. The authenticated `topics.canonical.inspect` contract and response remain unchanged and never expose payloads.

### Persist a narrow Topic application state family

The shared repository package gains strict records and CRUD for one Topic registry state plus the existing Topic Graph, Concept, Topic Concept link, interest metadata, and discovery-hint families required by apply. The plugin full repository reuses those facts; the Node adapter creates exactly the foundation plus Topic application tables. List reads the indexed registry, while detail combines registry state with one strict canonical read.

This is preferable to scanning canonical directories or storing opaque application blobs. Startup continues to reconcile only operations and the one canonical journal; it never scans Topics.

### Canonical promotion is the commit point

Create supplies `expectedBasis:null`. Full and patch updates supply the currently read manifest/artifact basis, while patch additionally checks its declared section read-set through the structured-artifact engine. Validation, missing/existing Topic, conflict, busy, recovered failure, or repair-required outcomes before promotion do not change current or projections.

After `promoted`, registry and derived projections are updated in short repository transactions. A projection or terminal-operation receipt failure cannot roll canonical current back; the result is successful with stable warning diagnostics and the operation is completed when possible. Re-running the same projection is idempotent.

### Keep the service composition private and mutation-disabled

The Node main process constructs the Topic application only after repository and canonical recovery and closes admission during shutdown. Tests call the composition directly against real shadow roots. Discovery advertises no new capability and `mutationEnabled:false` continues to mean no production mutation authority.

## Risks / Trade-offs

- [The extracted apply method is broad] -> Move one coherent use case and delete migrated helpers instead of introducing many generic utilities.
- [Canonical and derived SQLite state can diverge after the commit point] -> Treat canonical as truth, return structured warnings, keep projections idempotent, and defer automatic scanning/rebuild policy.
- [Synchronous Node IO can delay control-plane work] -> Admit one canonical apply globally, keep repository transactions short, and expose no remote hot path in this change.
- [Plugin parity can drift during delegation] -> Compare complete hashes, stable results, and representative create/full/patch failures against current Core 129/132 fixtures.
- [Older docs could reactivate Topic mirror assumptions] -> Update current-state docs to record that mirror remains retired and out of scope.

## Migration Plan

1. Add strict contracts, ports, and application tests before moving implementation.
2. Extend the shared repository and canonical read port, then add the isolated Node composition and restart tests.
3. Delegate only plugin bundle validation and optimistic decisions to the shared application, retaining production Topic persistence and public routing unchanged.
4. Extend boundaries, packaging, fingerprints, inventory, and documentation.
5. Ship source only. Rollback restores plugin-local validation helpers and removes the isolated Topic tables/application owner; shadow files remain inert and production data is untouched.

## Open Questions

None. Remote asset upload, production routing, delete/archive, explicit projection repair, and WS7 cutover require separate changes.
