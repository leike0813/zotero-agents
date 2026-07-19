## 1. Contract-first tests

- [x] 1.1 Add reviewed Metrics request/result canonical corpus cases and worker framing definitions, then record the expected contract fingerprint change
- [x] 1.2 Update Core 185, 193, 195, 198, and 218 for Rust parity, shared mixed-backend failures, authenticated HTTP, and ancillary packaging before production edits

## 2. Native protocol and engine

- [x] 2.1 Create the pinned three-crate Cargo workspace with only `serde`, `serde_json`, and `sha2`
- [x] 2.2 Implement strict Metrics DTO/canonical semantics and exact Metrics v2 computation against the Node oracle
- [x] 2.3 Implement bounded JSON-lines worker framing, cooperative cancellation, candidate HTTP serving, and a separate failure fixture child

## 3. Shared execution route

- [x] 3.1 Add the Rust child backend beneath the existing compute-pool queue, deadlines, cancellation, shutdown, replacement counters, and degraded fuse
- [x] 3.2 Resolve and verify the production binary only from its fixed immutable bundle-relative path while permitting explicit test fixture injection
- [x] 3.3 Remove the active Node worker Metrics protocol/compute/result branches and verify no runtime fallback remains

## 4. Packaging and documentation

- [x] 4.1 Add source/lock fingerprinting, provenance, license inventory, ancillary v1 packaging, executable verification, and freshness checks
- [x] 4.2 Add the independent five-target candidate workflow with per-target 15 MiB and aggregate 75 MiB compressed budgets
- [x] 4.3 Update active Synthesis documentation to describe the accepted Node-front-door/Rust-worker current state and remaining R8 boundary

## 5. Verification

- [x] 5.1 Run Cargo fmt, clippy, locked workspace tests, contract checker, package TypeScript checks, service build, and emitted-import checks
- [x] 5.2 Run Core 185, 193, 195, 198, and 218 plus the complete frozen Stage 1 Core 175-218 suite `[27, 1, 16]`
- [x] 5.3 Verify the maximum valid Metrics profile stays below five seconds and 256 MiB peak RSS, and the local compressed candidate stays below 15 MiB
- [x] 5.4 Run boundary `108 methods / 1 consumer`, removed-symbol/fallback audits, targeted ESLint/Prettier, `git diff --check`, and strict OpenSpec validation
- [x] 5.5 Run the five-platform remote candidate matrix and confirm all smoke, provenance, per-target, and aggregate size gates (requires a pushed workflow run)

