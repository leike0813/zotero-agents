## Context

R4 established `synthesis-native-worker` plus one bounded service-owned compute pool for six deterministic Rust operations. The remaining private Node worker surface contains three substantially larger domains: reference matching, Topic Structured Artifact processing, and Citation Graph Build, including a staged transfer path for graphs beyond the monolithic wire envelope. These domains already have environment-neutral TypeScript engines and strict DTOs, but their private application composition still creates in-process/Node implementations and several result rebuilders establish trust by rerunning the TypeScript algorithm.

R5 changes only the private Node sidecar compute route. The plugin remains TypeScript-based and continues to own production DB, canonical files, Host effects, public client contracts, and all promotion decisions. The native child has no filesystem, repository, network, Zotero, or Host authority.

## Goals / Non-Goals

**Goals:**

- Add eight contract-first Rust operations with canonical parity and stable failures.
- Route private matcher, Topic, monolithic graph, and staged graph transfer through the existing one-active/two-queued pool.
- Use bounded, acknowledged paging for rows and arbitrary nested JSON without whole-payload duplication.
- Replace production algorithm replay with strict structural and domain-invariant result validation.
- Delete migrated Node worker branches and leave layout as the only R6 Node kernel.
- Meet deterministic quality, timeout, RSS, packaging, provenance, and five-target gates.

**Non-Goals:**

- No public HTTP/client/config capability and no production plugin cutover.
- No DB, canonical format, Host effect, or durable ownership migration.
- No runtime fallback or provider/backend-specific behavior.
- No Citation Graph layout v2, durable Rust parity, final native packaging cutover, or Node sidecar deletion.

## Decisions

### 1. Three domain crates behind the existing protocol crate

Add `synthesis-reference-matcher`, `synthesis-topic-structured-artifact`, and `synthesis-citation-graph-build`. `synthesis-protocol` remains the SSOT for canonical JSON, UTF-16 ordering, SHA-256 identities, safe-number semantics, frames, page descriptors, common bounds, and stable error mapping. The worker binary performs closed dispatch only.

This keeps domain algorithms cohesive and prevents the worker binary or Node service from becoming a second contract implementation. A single large crate was rejected because matcher, arbitrary-JSON Topic processing, and graph streaming have different invariants and test matrices.

### 2. Contract-first differential migration

Before routing, extend schema inventory, positive/negative corpus, canonical edge corpus, operation mapping, and fingerprint. Locale-dependent ordering in matcher and graph is replaced by the shared UTF-16 comparator before capturing the migration baseline. The reference-resolution harness imports the current matcher package and uses reviewed labels as the quality oracle.

TypeScript remains the differential oracle only. Runtime result rebuilders validate stable facts and invariants; they do not invoke the algorithm again. Algorithm replay was rejected because it doubles CPU/memory and hides an incomplete trust boundary.

### 3. Two paging representations, one framing protocol

Matcher and graph DTO collections use `canonical_json_rows.v1`, preserving row boundaries and stable kind/index ordering. Topic values may contain arbitrarily nested valid JSON, so each value is encoded once as canonical UTF-8 and split into ordered chunks whose encoded frame remains below 4 MiB. Descriptors contain section identity, chunk/page index, count, byte length, node count where applicable, and SHA-256.

All streams use one-page-in-flight acknowledgement. The terminal result header echoes task id, operation, canonical request hash, descriptors, and aggregate identity. Sending giant one-line Topic objects, base64-wrapping full payloads, or relying on IPC buffering was rejected due to transient duplication and envelope risk.

### 4. Graph transfer reuses the existing owner and staged bytes

The transfer owner keeps session lifecycle, input/output directories, TTL, idempotency, retry, cancellation, validation, and atomic attempt publication. It passes the already staged canonical page bytes to `citation_graph_build_transfer.v1`; Rust writes/emits raw canonical result page artifacts, which the same owner validates and atomically promotes. Neither Node nor Rust materializes a complete transfer DTO.

A second native transfer service was rejected because it would duplicate lifecycle and persistence authority. Re-encoding staged pages was rejected because it changes byte identity and increases peak memory.

### 5. One pool and domain-specific deadlines

All fourteen Rust operations share one child backend, one active/two queued admission, cancellation, replacement, restart counters, three-fault fuse, and 500 ms shutdown. Matcher, Topic, and monolithic graph retain the five-second hard deadline. Streaming graph transfer retains thirty seconds active time and 100 ms cancellation grace. Wire rejection occurs before admission and does not count as a worker fault.

Separate pools were rejected because they would weaken global resource bounds and split degradation truth. Runtime fallback was rejected by migration governance.

### 6. Pool-backed adapters preserve application ports

Reference matching review and Topic application receive adapters implementing their existing engine interfaces. The adapters canonicalize requests, stream frames, rebuild results, and map pool errors; application orchestration and promotion semantics remain unchanged. Graph monolithic and transfer routes share the Rust graph crate through direct and streaming adapters.

This injection boundary keeps private routing out of engines and avoids contaminating plugin-safe TypeScript packages with Node-only transport.

### 7. Deletion follows accepted parity gates

Once relevant differential, fault, resource, and build-parity tests pass, delete matcher/Topic/graph Node worker dispatch, packed graph compute carrier, and test-only fixtures. Retain only Citation Graph layout in the Node worker source/build parity surface for R6. TypeScript engines are retained as plugin implementations and test oracles through R9.

### 8. Packaging and acceptance are auditable

Cargo workspace/lock and fixed dependency licenses/provenance are updated together. Source and build fingerprints inventory all fourteen operations. Local acceptance includes Rust fmt/clippy/locked tests, cross-language checker, targeted TypeScript checks, service build, Core 175–218, boundary checks, lint/format, diff check, and strict OpenSpec validation. Remote acceptance requires five platform smokes and size limits before the final task checkbox is completed.

## Risks / Trade-offs

- [Matcher semantic drift from JavaScript string/number behavior] → Freeze UTF-16/NFKC/lowercase/rounding corpora first and require reviewed-fixture metric parity with zero danger false positives.
- [Topic canonical chunk splitting breaks arbitrary JSON] → Chunk canonical UTF-8 bytes, validate ordered aggregate hash, and parse only after complete bounded reconstruction.
- [Invariant validators accept fabricated output] → Validate complete input identity coverage plus domain relations, counts, ordering, and hashes; retain adversarial differential tests.
- [Graph normal profile exceeds memory/time] → Reuse staged bytes, stream one acknowledged page at a time, avoid full DTO/base64 copies, and enforce three-run RSS/deadline gates.
- [Shared child failure affects unrelated domains] → Preserve task isolation, replacement, and the existing explicit degraded fuse; successful tasks reset consecutive fault accounting.
- [Cross-platform Rust dependency or size regression] → Pin dependencies, audit licenses/provenance, measure compressed candidates, and require five-target smoke before completion.

## Migration Plan

1. Freeze contract comparator/canonical semantics, repair the benchmark harness, and capture reviewed TypeScript baseline.
2. Add schemas/corpora/inventory/fingerprint plus failing cross-language and Core tests.
3. Implement shared paging/request-hash protocol and the three Rust domain crates with Rust unit/differential fixtures.
4. Add pool operations and pool-backed matcher/Topic/graph adapters; switch monolithic and transfer routes.
5. Replace runtime algorithm replay with strict invariant validation and complete adversarial tests.
6. Delete migrated Node compute branches/fixtures; update fingerprint, build, packaging, licenses, provenance, and documentation.
7. Run local acceptance and size gates, commit/push, then run the five-platform matrix. Fix and repeat until green.
8. Record remote evidence and mark tasks complete. Stop with the change ready to archive; do not archive automatically.

Rollback during development is a code revert to the pre-R5 private Node candidate. There is no runtime fallback and no production data migration to reverse.

## Open Questions

None. The reviewed plan fixes operation names, ownership, bounds, deadlines, route scope, packaging gates, and completion boundary.
