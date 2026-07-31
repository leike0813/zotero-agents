## Context

The native production coordinator currently prepares one full Reference Refresh, reads every changed references and citation-analysis artifact, and sends the complete materialization to one `applyRefresh`. Preparation and apply both use the original 8 MiB/250,000-node bound. A large library can therefore pass every Host read limit and still fail after all reads when the aggregate apply request exceeds 8 MiB.

The plugin RPC client uses a roughly five-second local timeout and reports production transport failures with worker-oriented codes. Rust production operations use a separate deadline, while the shared operation manifest does not express per-capability deadlines. Debug diagnostics also assign independent identifiers at the plugin RPC, native operation, and Reverse Host boundaries, preventing a selected Dashboard failure from reconstructing the causal chain.

The repository already supports at-most-100-source `scope: sources` CAS promotion and full-scope replacement. That existing boundary is sufficient for convergence without a staging table or schema migration.

## Goals / Non-Goals

**Goals:**

- Promote changed Reference Refresh sources in deterministic, bounded batches and retain completed batches when a later batch fails or the deadline expires.
- Make retry process only failed or still-stale sources and run deletion cleanup only after every current source converges.
- Separate preparation admission limits from materialized apply-batch limits derived from the two bounded artifact-read payloads a source can contribute.
- Establish the operation manifest as the deadline source of truth for TypeScript and Rust production routing.
- Preserve native `operation_timeout` and use transport-specific production RPC errors.
- Correlate debug-only RPC, operation, batch, Reverse Host, apply, and terminal events without allocating debug success state in production.

**Non-Goals:**

- Paging a preparation whose descriptors or item summaries alone exceed 8 MiB/250,000 nodes.
- Adding staging tables, changing the repository schema, changing Topic or WebDAV behavior, or changing historical transcript/storage formats.
- Rebuilding or republishing seven-platform sidecars, launching Zotero, committing, pushing, or releasing.

## Decisions

### Batch by stable source identity and existing CAS scope

The coordinator sorts current sources by `paper_ref`, groups at most 100 sources per batch, and uses descriptor `estimated_size` to avoid constructing obviously oversized batches. Each batch executes the existing `scope: sources` prepare/read/apply sequence against the latest active reference hash. Successful batches become immediately readable and advance the CAS basis for the next batch.

One monolithic preparation with streaming apply was rejected because it would retain a cross-batch preparation lifecycle and require new staging semantics. Repository-backed staging was rejected because current source-scope CAS already supplies durable progress without a migration.

### Split on measured capacity failures

The shared contract keeps preparation requests bounded at 8 MiB and 250,000 JSON nodes. A materialized apply batch instead allows two maximum `library.artifacts.read` responses plus a fixed JSON envelope allowance; its node limit is derived on the same two-artifact basis.

Estimates are admission hints, not correctness checks. Every rebuilt apply request is measured. If a multi-source batch exceeds either materialized limit, the coordinator discards its preparation, splits the stable source list in half, and retries both halves. A single-source overflow returns a stable source-scoped failure with measured and configured bytes/nodes.

Unlimited growth was rejected because it would remove the bounded-memory guarantee. Treating all capacity failures as terminal was rejected because aggregate estimation cannot perfectly predict JSON envelope and encoding cost.

### Preserve partial success and defer full cleanup

The coordinator returns processed and failed source identities with a retryable flag. A successful batch remains committed if a later Host read, apply, or deadline fails. Failed sources retain their last-good rows because source-scope replacement is transactional. Retry re-enumerates descriptors, compares active artifact hashes, and skips already converged sources whose hashes did not change.

After all current sources have converged, the coordinator executes one no-payload full-scope sweep. The sweep removes rows owned by sources no longer present in Zotero. It never runs after partial failure, which prevents deletion from being inferred from an incomplete enumeration.

### Use manifest-owned operation deadlines with transport grace

Each production operation manifest entry may declare `deadlineMs`; absent values resolve to the 10-second default. `startReferenceSidecarRefresh`, `refreshReferenceSidecarNow`, and `retryReferenceSidecarRefresh` declare 60 seconds. The TypeScript production client reads this same JSON manifest and sets its local transport timer to the operation deadline plus two seconds. Compute, workbench, and transfer clients retain their current policies.

The grace permits the native runtime to return `operation_timeout` before the socket is locally abandoned. Local production transport failures use `request_timeout`, `request_canceled`, `response_invalid`, or `service_unavailable`; worker vocabulary remains confined to worker clients.

### Carry one debug-only root correlation identity

The outer plugin request ID becomes `correlationId`. Native RPC request IDs, operation IDs, and Reverse Host request IDs remain locally unique and additionally carry the root identity. Debug batch events include batch ordinal, source and payload counts, and measured/configured byte and node totals.

The Dashboard first joins events by `correlationId`, then falls back to historical request/operation ID equality for older events. Production still records only bounded failures. Debug correlation propagation, success event construction, retention, subscription, and rendering remain behind the existing compile-time/runtime gates; diagnostics-disabled Rust paths borrow no correlation string.

## Risks / Trade-offs

- [Many small batches increase Host round trips] → Cap batches at 100 sources and use descriptor estimates to fill bounded batches before relying on measured splitting.
- [Partial success changes the active reference hash several times] → Re-read the active hash before each source-scope CAS and report processed/failed sources explicitly.
- [A source changes during retry] → Bind every preparation and payload to descriptors and reference-hash CAS; stale work fails without replacing last-good rows.
- [The final sweep can race a new source] → Prepare it from a complete current enumeration and use the same active-basis CAS; a mismatch is retryable.
- [Longer deadlines could mask hangs] → Limit the override to the three observed Reference Refresh operations and stop admitting new batches when remaining deadline is exhausted.
- [Correlation metadata could leak source identity] → Record counts and opaque IDs only; never include paper refs, locators, payloads, note text, or credentials in events.

## Migration Plan

1. Add delta specs and focused failing TypeScript/Rust contract, batching, timeout, and correlation tests.
2. Extend the shared materialization and operation manifests, generated/rebuilt Rust contracts, and stable error vocabulary.
3. Implement deterministic coordinator batching, measured split/retry, partial result reporting, and final sweep with no schema change.
4. Route production plugin RPC through manifest deadline policy and propagate debug-only correlation through native and Reverse Host boundaries.
5. Update Dashboard projection and current-state runtime/performance documentation.
6. Run focused Core/Zotero routes, typecheck/build, Rust fmt/clippy/tests, parity/release-elision checks, strict OpenSpec validation, and `git diff --check`.
7. Build the current target with the pinned nightly toolchain and package it into the existing current-target addon location for local retesting.

Rollback restores monolithic materialization and the previous RPC policy. Already promoted source batches remain valid repository state and require no data migration.

## Open Questions

None. The source-batch strategy, 60-second overrides, local-only package scope, and absence of database staging were fixed before implementation.
