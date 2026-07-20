## 1. Contract and oracle baseline

- [x] 1.1 Extend Core 186/187/191 contract tests for the eight R5 operation schemas, inventory, positive/negative corpora, request hashes, paging/chunking, and fingerprint.
- [x] 1.2 Replace matcher and graph locale-dependent ordering with the shared UTF-16 comparator and freeze NFKC, English lowercase, number rounding, safe-integer, and canonical-hash edge behavior.
- [x] 1.3 Repair the reference-resolution harness to use the current package SSOT, update its skill documentation to current state, and capture a reviewed-label migration baseline report.
- [x] 1.4 Implement TypeScript R5 request/result/frame rebuilders and invariant-only result validation without production algorithm replay.

## 2. Rust domains and protocol

- [x] 2.1 Add failing Rust/cross-language tests for matcher, Topic, graph, corrupt pages, result identities, cancellation, and resource bounds.
- [x] 2.2 Extend `synthesis-protocol` with R5 operation identities, canonical request hashes, row pages, Topic UTF-8 chunks, descriptors, ACKs, terminal frames, and stable error mapping.
- [x] 2.3 Add `synthesis-reference-matcher` with binding and canonical-dedupe parity, policy budgets, cancellation checkpoints, and quality fixtures.
- [x] 2.4 Add `synthesis-topic-structured-artifact` with manifest validation, assembly, artifact validation, patch semantics, arbitrary-JSON bounds, and cancellation checkpoints.
- [x] 2.5 Add `synthesis-citation-graph-build` with direct and streaming adapters, graph invariants, canonical output paging, and cancellation checkpoints.
- [x] 2.6 Register all crates and eight operations in the native worker, Cargo workspace/lock, and source fingerprint.

## 3. Shared pool and application routing

- [x] 3.1 Extend Core 195/199/201/202 pool and transport tests for fourteen operations, five-/thirty-second deadlines, ACK order, cancel, timeout, crash, replacement, fuse, and shutdown.
- [x] 3.2 Extend the service compute pool and Rust transport to dispatch all R5 operations through one active/two queued authority.
- [x] 3.3 Inject a pool-backed Rust matcher adapter into private reference matching review composition and preserve preparation/apply atomicity.
- [x] 3.4 Inject a pool-backed Rust Topic adapter into private Topic composition and preserve conflict/failure atomicity.
- [x] 3.5 Route monolithic graph canary to Rust and validate direct/packed canonical parity.
- [x] 3.6 Route staged graph transfer through the same Rust child using existing staged canonical bytes and raw-result artifacts under the existing owner.

## 4. Deletion and regression coverage

- [x] 4.1 Extend Core 206/207/209/218 tests for matcher quality, Topic boundaries, graph byte/hash parity, retry/idempotency, rollback, and atomic publication.
- [x] 4.2 Delete matcher, Topic, and graph private Node compute branches, packed graph carrier, and test-only worker fixtures; retain only R6 layout.
- [x] 4.3 Verify TypeScript engines remain plugin-safe production implementations and differential-test oracles with no Node-only imports.
- [x] 4.4 Run matcher/Topic maximum profiles and graph normal profile three times and record deadline, peak-RSS, precision/recall/candidate-recall, and danger-false-positive results.

## 5. Packaging and documentation

- [x] 5.1 Update fixed dependency licenses/provenance, runtime freshness, worker smoke, operation inventory, and candidate size audit for fourteen Rust operations.
- [x] 5.2 Update migration plan and active Synthesis current-state documents to mark R5 complete and retain explicit R6–R9 boundaries.
- [x] 5.3 Build the local compressed native candidate and verify it is below 15 MiB.

## 6. Local acceptance

- [x] 6.1 Run Rust fmt, clippy, locked workspace tests, and the cross-language contract checker.
- [x] 6.2 Run related TypeScript checks, service build, Stage 1 Core 175–218, and boundary/invariant checks.
- [x] 6.3 Run ESLint, Prettier, `git diff --check`, and strict OpenSpec validation; resolve every R5 regression.

## 7. Commit and five-platform acceptance

- [ ] 7.1 Commit the complete local-green change as `refactor: migrate synthesis complex kernels to rust` and push current `dev-refactor` without altering `reference/Skill-Runner`.
- [ ] 7.2 Monitor Windows x64, macOS x64/arm64, and Linux x64/arm64 Rust candidate smokes and per-platform/aggregate size gates; fix, recommit, and repush until all pass.
- [ ] 7.3 Record final local and remote evidence, mark all tasks complete, and stop with R5 ready to archive without archiving it.
