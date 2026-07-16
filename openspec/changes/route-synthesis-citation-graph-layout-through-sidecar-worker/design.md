## Context

Citation Graph layout is already a strict pure engine in
`packages/synthesis-engine` and the sidecar exposes it through authenticated
HTTP backed by a bounded single-worker pool. Production composition still
injects the in-process engine, while the plugin service owns graph reads, basis
hash checks, repository promotion, diagnostics, and previous-layout retention.

The route must preserve the public `SynthesisClient` contract, the existing
dispatch-before `timeBudgetMs` behavior, `108 methods / 1 direct consumer`, and
`mutationEnabled: false`. It must not grant the sidecar DB, canonical-file,
Host, Zotero, or subprocess authority.

## Goals / Non-Goals

**Goals:**

- Make the bounded sidecar worker the only production Citation Graph layout
  compute implementation.
- Fail closed across readiness, authentication, restart identity, transport,
  cancellation, deadline, worker, and result-validation failures.
- Keep persistence, basis validation, promotion, and public diagnostics under
  the existing plugin service owner.
- Make production routing and release freshness machine-checkable.

**Non-Goals:**

- Routing the other seven engines or any database/canonical-file operation to
  the sidecar.
- Adding fallback, retry, readiness waiting, UI, preferences, persistence,
  protocol endpoints, dependencies, or runtime warmup.
- Generating, downloading, publishing, or synchronizing platform prebuilds.

## Decisions

### Production composition injects a sidecar-backed engine adapter

The existing `SynthesisCitationGraphLayoutEngine.compute(request)` seam remains
unchanged. A new adapter obtains the current ready supervisor connection and
calls the internal compute client. Production legacy composition injects this
adapter with its lifecycle AbortSignal instead of the in-process adapter.

`createSynthesisService` retains its in-process default for isolated tests and
non-production composition. Static governance verifies that production
composition cannot import or construct the in-process layout engine. Changing
the service seam or adding a runtime branch was rejected because it would spread
transport concerns into domain orchestration and create a hidden fallback.

### Each operation resolves a fresh ready connection and never waits

The adapter reads the supervisor's ready connection on every compute call and
does not cache host, port, token, profile, or service instance. A missing ready
connection fails immediately with `service_not_ready`; it does not start the
runtime, poll, wait, retry, or execute locally.

This preserves lazy sidecar/worker startup and makes supervisor restart an
explicit availability boundary. A connection that becomes stale between lookup
and response fails through authentication, network, or runtime-identity checks;
the operation is not replayed because replay could outlive the graph basis that
the plugin intends to promote.

### Transport identity and error normalization live in the internal client

The compute connection includes the expected `serviceInstanceId`. Each request
uses a unique request ID, and the client validates both echoed request ID and
service instance before rebuilding the strict engine result. Identity mismatch
is `runtime_mismatch`; malformed or incompatible results are
`worker_result_invalid`.

Caller abort maps to `worker_canceled`, the fixed local five-second deadline to
`worker_timeout`, and fetch/network failure to `worker_unavailable`. Known
server error codes pass through unchanged. These remain internal errors: the
existing synthesis service catch path records `citation_graph_layout_failed`,
preserves the old layout, and exposes no tokens, paths, or raw transport errors.

### Soft dispatch budget and hard worker deadline remain separate

The existing operation `timeBudgetMs` remains a dispatch-before soft budget; it
does not become a transport timeout. Once dispatched, the compute client uses
the sidecar's fixed five-second hard deadline and the composition lifecycle
AbortSignal. This avoids changing public options or the engine interface while
retaining the worker pool's established cancellation contract.

### Plugin authority and basis-safe promotion do not move

The plugin reads the current graph, builds the strict engine request, awaits the
sidecar result, re-reads/checks the graph basis, and alone promotes repository
state. Any failure retains the prior layout. If the graph changes while compute
is in flight, the result is discarded as
`citation_graph_layout_basis_superseded`; late results after cancellation cannot
be promoted.

### Source routing lands before platform prebuild publication

Bundle, manifest, fingerprint, freshness, license, and XPI checks are updated
to treat the worker/engine graph as a production requirement. The repository
does not build or publish five-platform artifacts in this change. Release gates
must therefore fail closed until the separate release pipeline regenerates and
synchronizes prebuilds for the current fingerprint.

## Risks / Trade-offs

- [Sidecar startup is asynchronous, so early layout requests can fail] → Return
  stable `service_not_ready`, retain the previous layout, and require an
  explicit later operation instead of hiding readiness with retries.
- [A supervisor restart can race an in-flight call] → Validate service identity
  and fail without replay or promotion.
- [The production route adds serialization and IPC overhead] → Keep graph/DB
  work local, preserve bounded wire/pool limits, and guard representative route
  latency without brittle wall-clock assertions.
- [Source and shipped prebuilds can temporarily diverge] → Include the complete
  runtime graph in fingerprint/freshness governance and block release until the
  dedicated prebuild workflow catches up.

## Migration Plan

1. Add failing adapter/client, production-route, ownership, restart, packaging,
   and invariant tests.
2. Harden compute identity/error handling and implement the sidecar engine
   adapter.
3. Switch only production legacy composition and verify basis-safe failure paths.
4. Update migration inventory, release governance, and current-state docs.
5. Run focused and repository gates plus strict OpenSpec validation.

Rollback replaces the production adapter injection with the in-process engine
and reverts routing governance. No data migration is needed because storage and
promotion formats never move.

## Open Questions

None. Readiness, deadline, fallback, prebuild, and authority policies are fixed
by this change.
