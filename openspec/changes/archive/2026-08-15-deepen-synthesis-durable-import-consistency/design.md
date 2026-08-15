## Context

See `proposal.md` for motivation. The repository transaction atomically writes imported durable facts, projection-staleness state, sync metadata, and one `synt_durable_import_commit` receipt. The canonical store separately persists `import-batch.json` and supports idempotent multi-Topic promotion. `DurableBundleApplication` already knows both protocols, but its recovery entry point is not part of production acquisition.

The production runtime constructs applications before binding the listener and publishing discovery. This existing ordering is the ready seam. SQLite and the canonical filesystem are local-substitutable dependencies with one production adapter each; remote bundle reads and WebDAV publication remain real seams.

## Goals / Non-Goals

**Goals:**

- Make successful Durable Bundle application acquisition mean that all pending import evidence is reconciled.
- Give live apply and restart recovery one consistency completion path and one receipt-clear owner.
- Test crash-window behavior through the runtime lifecycle interface using real local storage.
- Reduce the application interface by deleting unused and hypothetical seams.

**Non-Goals:**

- Change SQLite, canonical batch, bundle, manifest, or WebDAV wire schemas.
- Add SQLite compensation after its import transaction commits.
- Add an offline repair command or choose between inconsistent durable facts.
- Change TypeScript production code, plugin UI, WebDAV conflict policy, or autosync triggers.

## Decisions

### SQLite receipt is the commit witness

Before the receipt commits, a staged canonical batch is disposable and canonical current remains unchanged. Once the receipt commits, canonical promotion only rolls forward. A compensating SQLite rollback would need to reverse imported facts, redirect normalization, domain bases, projection staleness, and sync metadata, expanding the interface and introducing a second cross-store protocol.

### Production acquisition owns reconciliation

`DurableBundleApplication` remains the sole external module. Its production acquisition interface requires the existing `RepositoryPort` and `CanonicalStorePort`, constructs the application, reconciles pending import state, and returns only after the application is ready. The runtime composition propagates acquisition failure before discovery publication.

The old public `recover_import` method and optional canonical dependencies are removed. A feature-gated development acquisition accepts deterministic time and receipt identity for the parity driver but calls the same private acquisition and reconciliation implementation.

### One private completion path owns receipt clearing

Both live apply after repository commit and startup acquisition call one private completion path. It idempotently completes canonical promotion, verifies every target against the receipt, and then clears the repository receipt. No other path clears that receipt.

Canonical recovery returns a typed outcome for no pending batch, a discarded uncommitted batch, or a promoted committed batch. When a repository receipt remains without a pending batch, the application verifies its canonical targets to establish the already-promoted state before clearing the receipt. Invalid, mismatched, incomplete, and temporarily unavailable cases map to reason-level failure codes instead of string success parsing.

### Local adapters stay inside the implementation

`DurableBundleRepositoryPort`, `DurableCanonicalSourcePort`, and `DurableCanonicalImportPort` are removed. The application directly uses the existing local `RepositoryPort` and `CanonicalStorePort`; their storage implementations remain outside the application interface. Tests use temporary SQLite and filesystem roots.

`DurableBundleSourcePort` remains because remote and fixture adapters both exist. `WebDavDurablePort` remains the WebDAV use-case seam. `DurableBundleSinkPort` is deleted because it has no adapter or non-`None` caller; export returns a value and the WebDAV adapter owns transport.

### Startup failures preserve evidence

Receipt/batch corruption, identity mismatch, or target mismatch fails startup and publishes no discovery. The first semantic failure remains primary; cleanup failures remain secondary through the existing runtime lifecycle result. No automatic repair removes evidence. A separately specified offline operation is required if such evidence ever needs manual resolution.

### Existing event text is documentation drift

The old `canonical-store-changed` event requirement is removed. Native production has no corresponding emitter or consumer, while canonical autosync observes the central post-commit classifier and intentionally excludes WebDAV imports. Promotion, target verification, receipt clearing, and projection staleness remain the completion facts.

## Risks / Trade-offs

- **[Risk] Startup now exposes durable inconsistencies that previously remained hidden until a canonical write.** → Return reason-level startup codes, preserve evidence, and never publish false readiness.
- **[Risk] Production and parity acquisition could diverge.** → Keep deterministic injection behind `parity-harness` and route both public constructors through the same private acquisition function.
- **[Risk] Runtime lifecycle tests may become slow.** → Reuse the existing process-lifecycle harness and cover the state matrix with shared fixture helpers instead of duplicating lower-level repository/canonical tests.
- **[Risk] Removing public traits can reveal unseen downstream consumers.** → Repository-wide symbol search shows only the production adapters and one fake recovery test; Cargo workspace compilation remains the acceptance check.

## Migration Plan

No data migration is required. Existing receipts and batches are consumed in place. Deploy the acquisition change with its process lifecycle tests; rollback is a code rollback because no persisted bytes change. A state that the new version classifies as inconsistent remains preserved for diagnosis across either version.
