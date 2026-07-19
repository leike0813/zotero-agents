## 1. Contract-first gates

- [x] 1.1 Add strict field-level schemas, operation/page envelopes, reviewed positive/negative corpus cases, and the expected cross-language fingerprint update
- [x] 1.2 Update Core 188-190, 195, 210-212, and 218 with explicit ordering, Rust parity, paging, atomic failure, and private application lifecycle expectations before route changes

## 2. Explicit TypeScript oracle semantics

- [x] 2.1 Replace locale-dependent Tag Vocabulary ordering with shared UTF-16 total ordering and preserve reviewed warning/index behavior
- [x] 2.2 Replace locale-dependent Concept KB and Topic Graph ordering with the shared UTF-16 comparator while retaining all current domain results

## 3. Native protocol and kernels

- [x] 3.1 Add the pinned `regress` dependency, lock/license/provenance inventory, and strict paged deterministic worker DTOs to the Rust protocol crate
- [x] 3.2 Implement the Tag Vocabulary validate/index crate with ECMAScript UCS-2 pattern parity and cooperative checkpoints
- [x] 3.3 Implement the Concept KB index/query crate with exact search, overlay, matching, ambiguity, ordering, and checkpoints
- [x] 3.4 Implement the Topic Graph index crate with exact placement/status semantics, ordering, and checkpoints
- [x] 3.5 Extend the executable worker with operation dispatch, one-page input/output ACK backpressure, hash/sequence validation, cancellation, and atomic terminal frames

## 4. Shared service execution

- [x] 4.1 Generalize the Metrics transport and operation protocol into a single Rust compute child transport
- [x] 4.2 Route all five private operations through the existing shared queue/deadline/cancel/replacement/fuse and strictly rebuild complete paged results
- [x] 4.3 Delete the five active Node worker branches and redundant Tag/Concept test Worker fixtures while retaining Topic Graph source/build parity

## 5. Packaging and current-state documentation

- [x] 5.1 Extend native source/lock fingerprinting, runtime packaging freshness, license inventory, size checks, and five-target worker smoke for all six Rust operations
- [x] 5.2 Update the active Rust migration plan to record R4 current state without adding compatibility or migration-history prose to runtime documentation

## 6. Verification

- [x] 6.1 Run Cargo fmt, clippy, locked workspace tests, cross-language checker, package TypeScript checks, service build, and emitted-import verification
- [x] 6.2 Run targeted Core 188-190, 195, 210-212, and 218 plus the complete Stage 1 Core 175-218 suite `[27, 1, 16]`
- [x] 6.3 Run each maximum collection-count representative profile three independent times below five seconds and 256 MiB peak RSS, and verify the local compressed candidate below 15 MiB
- [x] 6.4 Run boundary `108 methods / 1 consumer`, removed-symbol/fallback audits, targeted ESLint/Prettier, `git diff --check`, and strict OpenSpec validation
- [ ] 6.5 Run the five-platform remote candidate matrix and confirm smoke, provenance, per-target, and aggregate budgets when separate push/workflow authorization is available
