## Context

Production Topic Graph currently combines node, edge and review rows with checkpoint assets, projection-registry state, canonical diagnostics, proposal ingestion, user decisions, deletion, index rebuild and Workbench reads. Its root/unplaced index kernel is already environment neutral, but the isolated Node sidecar has no Topic Graph aggregate or repository schema. Copying production code into the service would create a second policy and persistence source of truth.

WS5 orders Tag Vocabulary, Concept KB and Topic Graph foundations before cross-domain sync/import/export. This change therefore owns the complete transactional Topic Graph aggregate needed by later routing while deliberately excluding checkpoint file delivery, discovery cascade, Workbench filtering and synchronization workflows.

## Goals / Non-Goals

**Goals:**

- Add strict private DTOs and lifecycle semantics for Topic Graph inspection, replacement, node/edge mutation, proposal/review decisions, deletion and index use cases.
- Consolidate Topic Graph rows, DDL, CRUD, stable identity, canonical direction, manifest hashing and mutation decisions in shared packages.
- Persist isolated aggregate state, manifest revision, last-good index and stale state in Node SQLite.
- Run index construction outside SQLite and the service main event loop.
- Preserve production-visible Topic Graph behavior while the private application remains disconnected from production routes and storage.

**Non-Goals:**

- Checkpoint export/import, canonical diagnostics/assets, WebDAV autosync, or generic JSON synchronization.
- Discovery candidate cascade, Topic Structured Artifact behavior, Workbench filtering, or automatic Topic application invocation.
- Public HTTP/RPC, `SynthesisClient`, Workbench commands, workflow, Host Bridge, or MCP routing.
- Production database/canonical ownership, shadow parity canaries, production cutover, or legacy factory removal.
- Changing Topic Graph index semantics, bounds, proposal thresholds, review transitions, or public results.

## Decisions

### Treat all Topic Graph rows and application state as one manifest-CAS aggregate

The private application stores a deterministic active manifest hash and monotonically increasing revision beside last-good index hash, basis, JSON and stale status. Every aggregate mutation supplies the expected manifest and commits row changes plus state changes in one short transaction. Snapshot replacement is included because it is the primitive needed for restart/recovery and later import work, but no import route is exposed.

### Keep graph mutation policy in the shared application

Stable edge/review identities, directional and symmetric tuple canonicalization, proposal type mapping, low-confidence review, unknown-target/self-edge/cycle rejection, confirmed/rejected user-decision preservation, review transitions and two-stage deletion are deterministic application policy. `approve_suggested` deliberately creates or restores a `suggested` edge; only an explicit edge decision can confirm it. The existing engine remains limited to strict root and unplaced derivation.

### Compute outside SQLite and promote by captured manifest

Index rebuild captures a strict repository snapshot, invokes the existing Topic Graph engine through one new internal worker operation, strictly rebuilds the worker result at both boundaries, then opens one transaction that succeeds only if the captured manifest remains active. Failure, timeout, cancellation, worker crash, malformed output or superseded basis cannot replace last-good index state.

### Use shared row and decision sources of truth

`synthesis-repository` owns strict row contracts, DDL/indexes, CRUD and state promotion. `synthesis-application` owns normalization, stable hashing, proposal/review/delete decisions and orchestration. The plugin repository/service delegates only semantically identical facts; plugin-only checkpoints, canonical diagnostics, projection registry, discovery cascade, Workbench filters and public wrappers stay in plugin composition.

### Keep the Node composition private and drain it first

The Topic Graph application is created after isolated repository recovery. Shutdown stops mutation admission, cancels/drains active Topic Graph computation, then closes the repository and worker pool. The internal compute protocol gains one Topic Graph operation name, but the public sidecar capability catalog and authenticated dispatch remain unchanged.

## Risks / Trade-offs

- [Graph rows have cross-references and hierarchy constraints] → Strict snapshot rebuilding, reference checks, deterministic ordering and cycle validation prevent invalid partial state.
- [Proposal policy can diverge from production behavior] → Extract production-compatible normalization and decisions, then retain representative production tests alongside new shared-application tests.
- [Async index work can race a concurrent mutation] → Promotion uses the captured manifest and rejects superseded computation without changing last-good state.
- [Deletion can erase review history or leave dangling rows] → Preserve mark-delete and physical purge as separate atomic operations with explicit counts.
- [Worker additions can accidentally become public capabilities] → Keep the operation internal and lock public capability/method inventories in invariant tests.

## Migration Plan

1. Add red strict-contract, repository, application, worker, lifecycle and composition coverage.
2. Add shared DTOs, row schema/CRUD, deterministic decisions and the private application.
3. Extend the isolated Node adapter and worker, then compose it after repository recovery.
4. Delegate compatible plugin facts to shared sources without changing production storage or routing.
5. Update inventories and current-state documentation and run focused/full validation.

Rollback removes the private composition and isolated Topic Graph tables. Isolated shadow state is never used as production fallback, so no production schema or canonical-file rollback is required.

## Open Questions

None. Checkpoint/import/export, canonical delivery, discovery integration, WebDAV, WS6 parity, WS7 cutover and later plugin cleanup require separate changes.
