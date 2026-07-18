## Context

Production Concept KB currently combines concept, sense, alias, relation, review-item and topic-link rows with canonical files, projection-registry state, diagnostics, proposal matching, review transitions, index rebuild and candidate query. Its index/query kernel is already environment neutral, but the isolated Node sidecar has no Concept aggregate or repository schema. Copying production code into the service would create a second policy and persistence source of truth.

WS5 orders Tag Vocabulary, Concept KB and Topic Graph foundations before cross-domain sync/import/export. This change therefore owns the complete transactional Concept aggregate needed by later routing while deliberately excluding checkpoint file delivery and synchronization workflows.

## Goals / Non-Goals

**Goals:**

- Add strict private DTOs and lifecycle semantics for Concept inspection, replacement, proposal/review mutation, deletion, index and query use cases.
- Consolidate Concept rows, DDL, CRUD, stable identity, manifest hashing and mutation decisions in shared packages.
- Persist isolated aggregate state, manifest revision, last-good index and stale state in Node SQLite.
- Run index construction and candidate query outside SQLite and the service main event loop.
- Preserve production-visible Concept behavior while the private application remains disconnected from production routes and storage.

**Non-Goals:**

- Checkpoint export/import, canonical asset delivery, WebDAV autosync, or generic JSON synchronization.
- Public HTTP/RPC, `SynthesisClient`, Workbench, workflow, Host Bridge, or MCP routing.
- Production database/canonical ownership, shadow parity canaries, production cutover, or legacy factory removal.
- Changing Concept index/query engine semantics, public results, bounds, or proposal boundary classifications.

## Decisions

### Treat all Concept rows and application state as one manifest-CAS aggregate

The private application stores a deterministic active manifest hash and monotonically increasing revision beside last-good index hash, basis, JSON and stale status. Every aggregate mutation supplies the expected manifest and commits row changes plus state changes in one short transaction. Snapshot replacement is included because it is the primitive needed for restart/recovery and later import work, but no import route is exposed.

Splitting proposals, review and maintenance into separate stores was rejected because relations, reviews and topic links all refer to the same concept/sense identities and must share one atomic revision boundary.

### Keep proposal matching in the shared application

Stable concept/sense/alias/review identities, exact-label/alias merge, ambiguous-match review, low-confidence review, approval, explicit merge, rejection, display-text update and delete cascade are deterministic application policy. The existing Concept engine remains limited to strict index build and bounded query semantics. This keeps engine parity stable and avoids repository-specific matching branches.

### Compute outside SQLite and promote by captured manifest

Index rebuild captures a strict repository snapshot, invokes the existing Concept engine through a new internal worker operation, strictly rebuilds the worker result at both boundaries, then opens one transaction that succeeds only if the captured manifest remains active. Failure, timeout, cancellation, worker crash, malformed output or superseded basis cannot replace last-good index state. Candidate query also runs through the worker against a captured snapshot but never writes the repository.

Running query directly over a stored index was rejected for this slice because the current engine contract derives candidates from canonical Concept source rows; changing that meaning would be an engine change rather than an application foundation.

### Use shared row and decision sources of truth

`synthesis-repository` owns strict row contracts, DDL/indexes, CRUD and state promotion. `synthesis-application` owns normalization, stable hashing, proposal/review/delete decisions and orchestration. The plugin repository/service delegates only semantically identical facts; plugin-only canonical files, diagnostics, projection registry, checkpoint import/export, autosync and public wrappers stay in plugin composition.

### Keep the Node composition private and drain it first

The Concept application is created after isolated repository recovery. Shutdown stops mutation admission, cancels/drains active Concept computation, then closes the repository and worker pool. The internal compute protocol gains Concept index/query operation names, but the public sidecar capability catalog and authenticated dispatch remain unchanged.

## Risks / Trade-offs

- [The aggregate has six interrelated row sets] → Strict snapshot rebuilding, foreign-key checks, deterministic ordering and one manifest-CAS transaction prevent partial state.
- [Proposal matching can diverge from production behavior] → Extract production-compatible normalization and decision helpers, then retain representative production tests alongside new shared-application tests.
- [Async index work can race a concurrent mutation] → Every promotion uses the captured manifest and rejects superseded computation without changing last-good state.
- [Delete cascade can leave dangling facts] → Compute the complete cascade as one candidate snapshot and validate references before atomic replacement.
- [Worker additions can accidentally become public capabilities] → Keep names in the internal compute protocol and lock public capability/method inventories in invariant tests.

## Migration Plan

1. Add red strict-contract, repository, application, worker, lifecycle and composition coverage.
2. Add shared DTOs, row schema/CRUD, deterministic decisions and the private application.
3. Extend the isolated Node adapter and worker, then compose it after repository recovery.
4. Delegate compatible plugin facts to shared sources without changing production storage or routing.
5. Update inventories and current-state documentation and run focused/full validation.

Rollback removes the private composition and isolated Concept tables. Isolated shadow state is never used as production fallback, so no production schema or canonical-file rollback is required.

## Open Questions

None. Checkpoint/import/export, canonical delivery, WebDAV, WS6 parity, WS7 cutover and later plugin cleanup require separate changes.
