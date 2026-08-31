## Context

Production Tag Vocabulary currently combines deterministic TagVocab computation, plugin repository rows, canonical checkpoint files, projection-registry state, staged suggestions, audit rows, legacy parent-binding migration, Host Tag effects, and WebDAV autosync. The validation/index kernel and Host-effect DTOs are already environment neutral, but the isolated Node sidecar has no Tag aggregate or repository schema. Copying the production module into the service would create a second policy and persistence source of truth.

WS5 orders Tags/Concepts/Topic Graph before the cross-domain sync/import/export slice. This foundation therefore owns the complete transactional Tag aggregate needed by later routing while deliberately excluding checkpoint file delivery and import workflows.

## Goals / Non-Goals

**Goals:**

- Add strict private DTOs and lifecycle semantics for fifteen Tag-domain use cases.
- Consolidate Tag rows, DDL, CRUD, normalization, mutation decisions, hashes, and revisions in shared packages.
- Persist isolated vocabulary, staged suggestions, audits, index state, and Host-effect plans/receipts in Node SQLite.
- Run validation and index construction outside SQLite and the service main event loop.
- Preserve production-visible Tag behavior while the private application remains disconnected from production routes and storage.

**Non-Goals:**

- Checkpoint file export, Tag import preview/apply, WebDAV autosync, service asset delivery, or generic JSON import/export.
- Public HTTP/RPC, `SynthesisClient`, Workbench, workflow, Host Bridge, or MCP routing.
- Production database/canonical ownership, shadow parity canaries, production cutover, or legacy factory removal.
- Changing TagVocab rules, public result shapes, engine bounds, or Host-effect policy.

## Decisions

### Treat vocabulary and staged suggestions as one revisioned aggregate

The private application stores an active vocabulary hash and a staged revision. Vocabulary mutations use expected-vocabulary compare-and-swap; staged-only mutations use expected-staged-revision compare-and-swap. Promotion checks both and commits vocabulary rows, warning rows, staged removal, index staleness, and pending effects in one short transaction.

Splitting core vocabulary and staged promotion into separate changes was rejected because both mutate the same canonical aggregate and would require temporary duplicate revision and validation rules.

### Keep computation outside SQLite and promote by basis

The application captures a repository snapshot, invokes the existing strict Tag engine through the sidecar worker pool, strictly rebuilds the result, then opens one transaction that succeeds only if the captured basis is still active. Validation/index failure, timeout, cancellation, worker crash, malformed output, or superseded basis cannot replace last-good state.

Production plugin validation remains synchronous inside its existing repository transaction until cutover. Shared deterministic candidate and row helpers are reused without forcing the plugin through the asynchronous sidecar topology.

### Persist Host effects before dispatch

Promotion creates deterministic `ensure_present` effects for stable `{ libraryId, itemKey }` bindings and persists them as pending in the promotion transaction. Dispatch occurs only after commit and receipts are reconciled and stored in a later short transaction. Missing or failed Host delivery produces bounded diagnostics and retains pending facts; it never rolls back the vocabulary. Automatic replay is deferred until a routed Host owner exists.

Legacy numeric parent bindings are resolved through the existing bounded migration port before promotion. Resolution failure leaves both vocabulary and staged rows unchanged.

### Use shared row and decision sources of truth

`synthesis-repository` owns strict Tag row contracts, DDL/indexes, CRUD, and state/effect persistence. `synthesis-application` owns normalization, stable hashing, entry/staged mutation decisions, effect planning, and orchestration. The plugin repository re-exports/delegates these facts where compatible; plugin-only canonical files, diagnostics, projection registry, autosync, import preview state, and public wrappers stay in plugin composition.

### Keep the Node composition private

The Tag application is created after isolated repository recovery and stopped before SQLite/worker shutdown. The worker protocol gains internal Tag validation/index operations, but the sidecar capability catalog and authenticated dispatch remain unchanged. Direct composition tests may inject fake binding/effect ports; the default service has neither Zotero access nor a Host route.

## Risks / Trade-offs

- [Fifteen use cases create a broad change] -> They share one aggregate, engine, revision model, and promotion transaction; contract-first tests and grouped tasks keep the implementation bounded.
- [Async validation can race a concurrent mutation] -> Every promotion uses an expected basis and rejects superseded computation without changing last-good state.
- [Host delivery can fail after commit] -> Durable pending effects and strict receipts make failure visible and future retry possible without weakening the vocabulary commit.
- [Shared extraction can drift production behavior] -> Keep production wrappers and synchronous validation topology, then add representative row/decision/result parity tests before deleting duplicate helpers.
- [Worker additions can accidentally become public capabilities] -> Keep operation names in the internal compute protocol and lock the public capability/inventory lists in invariant tests.

## Migration Plan

1. Add red strict-contract, repository, application, worker, lifecycle, and composition tests.
2. Add shared DTOs, row schema/CRUD, deterministic decisions, and the private application.
3. Extend the isolated Node adapter and worker, then compose it after repository recovery.
4. Delegate compatible plugin facts to shared sources and remove duplicated definitions without changing production ownership.
5. Update inventories and current-state documentation and run focused/full validation.

Rollback removes the private composition and isolated Tag tables. Isolated shadow state is never used as production fallback; no production schema or canonical file rollback is required.

## Open Questions

None. Checkpoint/import/export, Host replay/routing, WS6 parity, WS7 cutover, and later plugin cleanup require separate changes.
