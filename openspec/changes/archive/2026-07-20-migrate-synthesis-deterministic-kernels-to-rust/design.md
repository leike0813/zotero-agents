## Context

R3 introduced one Rust executable and a JSON-lines worker for Citation Graph Metrics beneath the existing Node service compute pool. Tag Vocabulary validate/index, Concept KB index/query, and Topic Graph index still use TypeScript branches in `computeWorker.ts`, although their strict DTOs and private application ports already converge on the same pool. Their collection bounds permit payloads larger than the worker's eight-MiB frame, and their TypeScript implementations still contain locale-sensitive ordering. Tag validation additionally accepts a dynamic flagless JavaScript regular expression.

The production Zotero plugin continues to use the environment-neutral TypeScript engines. The private sidecar applications are disconnected foundations, so this change replaces only their active Node worker route and does not move repository, application, HTTP, or canonical-data ownership.

## Goals / Non-Goals

**Goals:**

- Make Rust the sole private-sidecar backend for all five R4 deterministic operations with exact rebuilt-result parity.
- Preserve the single compute-pool admission, deadline, cancellation, shutdown, replacement, and fuse authority.
- Give large deterministic DTOs one bounded, acknowledged, integrity-checked worker page protocol.
- Freeze ordering, lowercasing, regular-expression, canonical bytes, and hashes across TypeScript and Rust.
- Keep the same executable, candidate packaging, five-platform targets, and resource budgets.

**Non-Goals:**

- Public routes or client methods for these private operations; production plugin routing or persistence changes.
- Layout v2, complex R5 kernels, repository/application migration, runtime manifest v2, or native supervision.
- A Node fallback, per-domain worker process, second queue/fuse, or a source-tree JavaScript shim.
- Removing TypeScript engines that remain production plugin implementations and test oracles.

## Decisions

### Use three domain crates behind the existing protocol crate

`synthesis-tag-vocabulary`, `synthesis-concept-kb`, and `synthesis-topic-graph` each own one cohesive domain implementation. `synthesis-protocol` owns strict cross-process DTOs, operation literals, canonical comparison, and worker envelopes; the executable owns dispatch and process I/O. A single grab-bag deterministic crate was rejected because it would couple unrelated domain rules.

### Generalize the existing Rust transport and retain one pool state machine

The Metrics-specific TypeScript transport becomes `RustComputeWorkerTransport`. Metrics and all five new operations select the same lazily spawned Rust child. Layout, graph build, and graph transfer select the retained Node Worker. A normal idle backend switch terminates the previous child without counting as failure; faults from either backend update the same counters and degraded fuse.

### Page large requests and results without creating an external transfer session

The private worker protocol adds `run_begin`, canonical `input_page`, `input_ack`, `input_complete`, `result_begin`, `result_page`, `result_ack`, and `result_complete`. Each page identifies an operation-specific section and carries rows plus `{pageIndex,rowCount,byteLength,sha256}`. Record maps use sorted `[key,value]` rows. Page bytes and JSON nodes reuse the existing four-MiB/100,000-node transfer limits while the enclosing JSON-lines frame remains below eight MiB.

Only one page is outstanding in each direction. Rust validates section order, descriptor/hash, duplicates, total domain bounds, and request shape before computing. Node validates every result page and assembles a candidate only after the terminal frame; the existing result rebuilder is the atomic publication boundary. Partial output is discarded on every failure. Separate filesystem staging was rejected because these kernels must remain without filesystem authority.

### Replace implicit collation before comparing implementations

All domain ordering uses `compareSynthesisContractStrings`, whose UTF-16 code-unit semantics are already shared by canonical JSON and Metrics. Case-insensitive Tag ordering uses a lowercased comparison key followed by the original UTF-16 value as a total-order tie break. Existing ASCII fixtures remain unchanged; reviewed Unicode cases intentionally replace environment-dependent collation with a stable contract.

### Preserve dynamic JavaScript pattern behavior in Rust

Tag validation uses pinned `regress` with its UTF-16 feature and the UCS-2 matching path to mirror a flagless ECMAScript `RegExp`. It is the only new direct dependency and its transitive inventory, dual license, source, binary delta, and five-target support are recorded. Pathological backtracking remains isolated by the existing five-second deadline and kill/replacement behavior; there is no fallback to Node.

### Keep candidate HTTP private scope unchanged

The native candidate HTTP route continues to expose only Metrics. Five-platform smoke invokes the deterministic operations through worker mode. This proves the executable without inventing public capability contracts for disconnected private applications.

## Risks / Trade-offs

- [Paged protocol can expose partial output] → Keep per-page ACK backpressure and make the TypeScript result rebuilder the only publication boundary.
- [Unicode order changes rebuildable hashes] → Lock explicit request/result corpus and verify current ASCII production fixtures remain byte-for-byte unchanged.
- [ECMAScript regex drift or ReDoS] → Pin the implementation and features, add syntax/matching corpus, and test deadline kill plus shared fuse behavior.
- [Large Concept KB profiles exceed resource goals] → Page transport, drop completed page buffers, benchmark maximum collection-count profiles with representative strings, and keep the 256-MiB/5-second acceptance gates.
- [Protocol logic is duplicated by domain] → Put page descriptor, sequence validation, hash checking, and error mapping in shared protocol modules; domain crates provide only section DTOs and algorithms.
- [Removing Node canaries hides TS portability regressions] → Retain direct TS oracle coverage for every domain and the separately governed Topic Graph source/build Worker canary.

## Migration Plan

1. Extend strict schemas, worker envelopes, corpus, and failing Core/Rust tests while Node remains active.
2. Make TypeScript ordering explicit and implement the three Rust crates against the same gold results.
3. Add paged protocol execution and generalize the Rust transport beneath the existing pool.
4. Switch the five operations to Rust, prove private application CAS/rollback behavior, then delete the active Node branches and redundant Tag/Concept worker fixtures.
5. Refresh packaging fingerprints, licenses, documentation, local resource evidence, and five-target workflow smoke. Rollback before acceptance is the code-level reversion of this change; no durable data migration is required.

## Open Questions

None. Remote five-target execution still requires separate push/workflow authorization and is not simulated locally.
