## Context

See `proposal.md` for motivation. `CitationGraphApplication` currently depends on a twelve-method `CitationGraphRepositoryPort` whose sole production adapter delegates to `RepositoryPort`. Runtime Graph commands and read surfaces also obtain the repository owner directly. Full and incremental commands create a runtime intent operation, the application creates another graph operation, and cache basis is persisted after graph promotion. Production composition already creates a four-reader `RepositoryPort`; direct owner reads bypass that depth.

SQLite is a local-substitutable dependency. The application crate already depends on the repository crate, its Citation Graph tests use temporary SQLite with the concrete port, and no second persistence adapter exists. Public graph mutations already enter `runtime_public_maintenance_operation`, which is the sole owner of public admission, dispatch, lifecycle transitions, retry/continue, restart classification, events, and trace unpinning.

## Goals / Non-Goals

**Goals:**

- Give runtime callers one typed Citation Graph application interface with high leverage.
- Concentrate coherent graph reads, cursor identity, graph-specific persistence, cache readiness, and the private graph attempt in one module.
- Use the existing reader pool for Graph surfaces and keep compute outside writer ownership.
- Preserve public lifecycle ownership while removing the two overlapping internal graph records.
- Replace old tests with behavior tests at the application, repository transaction, and public runtime seams.

**Non-Goals:**

- Change public capabilities, request or response DTOs, stable statuses, deadlines, worker contracts, persisted schema, graph bytes, hashes, or cursor wire format.
- Move Host collection, wire adaptation, public maintenance checkpoints, or Workbench cross-domain review projection into graph persistence.
- Merge Reference refresh and Citation Graph rebuild, introduce another repository trait, or add an alternative production adapter.
- Change public maintenance restart, retry-successor, continue, event, or terminal-winner semantics.

## Decisions

### Use a typed read view and an opaque rebuild attempt

`CitationGraphApplication::read` returns a basis-bound opaque view with explicit typed operations for first page, continuation, neighborhood, metrics, and layout. Each operation uses a short reader transaction and revalidates the view basis; the view never holds a transaction across calls. Explicit methods were chosen over a query/result enum dispatcher and over a sealed generic projection interface because the current read families are stable and caller clarity is worth the small method surface.

`prepare_rebuild` creates a fresh opaque graph attempt and returns the current collection plan. Runtime collects current Host input and invokes `finish_rebuild` with either material or a typed collection failure plus the existing promotion checkpoint. The attempt is consumed, so success and failure converge through one settlement interface instead of a fallible begin/complete/fail protocol.

### Depend on the concrete local RepositoryPort

The application holds the existing concrete `RepositoryPort`. No private persistence trait is introduced: one production adapter and no persistence fake make such a seam hypothetical. Tests run against temporary SQLite. Compute, Host collection, and promotion checkpoint retain real injected seams because production and test adapters vary there.

The public `citation_graph.rs` module remains the only external module. Private `read`, `rebuild`, and `persistence` submodules organize the implementation. The persistence submodule uses private functions over the concrete port; it does not add a forwarding struct merely to rename the repository.

### Commit graph, cache basis, and the private terminal together

The repository gains graph-specific full and source-slice promotion operations that validate the expected graph basis and private attempt state, replace graph rows and derived state, upsert `citation-graph:library` cache basis, and terminalize the private graph operation in one SQLite transaction. The private operation reuses the existing operation storage and adds no table or public view.

Graph and cache commit is the domain effect. The application returns a typed outcome after commit. The outer public lifecycle then applies its own first-terminal-wins rule. A crash between these commits remains `restart_external_effect_unknown` for the public operation; the application never repairs or reclassifies that public state.

### Create one private attempt per actual dispatch

The public durable insert or continue winner controls whether a handler is dispatched. Each dispatched handler creates a new graph attempt with an application-generated identity. Public operation ID, retry key, predecessor, raw record, and diagnostics storage do not cross the application seam. Explicit public retry therefore creates a new private attempt and recaptures all facts.

### Preserve no-argument retry by reusing mode only

The no-argument retry capability reads the most recent failed private graph command only to select Full or Incremental mode. A new attempt rebuilds concrete scope from current cache diagnostics and current Reference/Host facts. If no failed mode exists, missing/failed/stale cache state may safely select current work: an active graph plus a valid stale delta selects Incremental, otherwise Full. Ready cache with neither a failed mode nor current work remains retry-unavailable. Canceled attempts do not become failed attempts.

This retains the no-argument wire while avoiding stored payload replay. Public maintenance control retry remains the mechanism when a caller has a public operation receipt.

### Keep runtime and Workbench responsibilities narrow

Runtime Graph adapters decode and encode wire DTOs, collect Host input, provide deadline and checkpoint behavior, and submit typed graph outcomes to the public lifecycle. The cross-domain Workbench review projection remains runtime-owned because it combines Topic, Reference, and Citation Graph facts. Production Graph surfaces no longer acquire `RepositoryPort::owner()`.

### Test through three established seams

Application tests cover coherent basis reads, cursor rejection, endpoint closure, last-good preservation, concurrent readability, and fresh-state retry. Repository tests cover deterministic bounded queries and the graph/cache/private-terminal transaction. One process route proves Citation Graph enters the existing public lifecycle and preserves wire bounds. Forwarding, owner access, operation IDs/phases, SQL counts, and internal call order are not test contracts.

## Risks / Trade-offs

- **[Risk] The opaque read view accidentally holds a reader transaction across UI think time.** → Store only a typed basis token and open a bounded transaction for each read method.
- **[Risk] Moving cursor and payload-shrink logic changes Graph wire output.** → Keep existing codecs and known page fixtures in runtime tests while moving only semantic projection.
- **[Risk] One transaction spans too much work.** → Prepare rows outside writer ownership; the transaction performs only basis checks and bounded persistence.
- **[Risk] Graph commit succeeds before public terminal persistence.** → Preserve the public lifecycle's existing unknown-external-effect restart classification and require explicit retry.
- **[Risk] Retry copies stale incremental scope.** → Persist only command mode for retry selection and derive every concrete scope from current cache diagnostics.
- **[Risk] Internal submodules become shallow wrappers.** → Keep them private, move graph rules rather than delegates, and delete any file whose removal would not spread complexity.

## Migration Plan

1. Add repository tests and the atomic graph/cache/private-operation promotion primitives.
2. Add typed application read tests and move coherent read projection behind the basis-bound view.
3. Add opaque attempt and retry behavior tests, then merge runtime intent and application receipt into the private operation.
4. Migrate native read and command adapters while keeping Host, wire, checkpoint, and public lifecycle ownership in runtime.
5. Delete `CitationGraphRepositoryPort`, production owner escapes, forwarding tests, and duplicate record logic.
6. Update domain language, project constraints, OpenSpec deltas, and Synthesis ownership documentation.
7. Run focused and workspace Rust gates, process evidence, cross-language parity, and strict OpenSpec validation.

Rollback is source-only before publication. The schema and public wire do not change, and existing graph/cache/operation rows remain readable; reverting restores the prior orchestration without data migration.
