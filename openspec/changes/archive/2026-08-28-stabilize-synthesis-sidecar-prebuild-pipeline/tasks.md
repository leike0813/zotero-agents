## 1. Stabilize Rust verification

- [x] 1.1 Add `synthesis-test-support::TestRoot` with portable unique paths, strict normal cleanup, and primary-panic preservation; verify its focused Rust tests pass
- [x] 1.2 Migrate sidecar test-owned temporary roots and release database/process owners before cleanup; verify no ignored test-root cleanup remains outside explicit deletion tests
- [x] 1.3 Replace ordering/absence sleeps with observable synchronization where applicable and verify the affected crate tests pass repeatedly
- [x] 1.4 Make the canonical workspace test command use `--no-fail-fast` and verify multiple test binaries remain runnable after a failure

## 2. Establish evidence identities and contracts

- [x] 2.1 Add failing contract tests for the four governed identities and implement their single input-classification source; verify workflow-only changes do not alter build identity
- [x] 2.2 Add failing result-v3 tests for strict fields, seven-target evidence, donor provenance, native current-run smoke, and audit-only legacy parsing; implement the closed parser and release-eligibility check
- [x] 2.3 Extend cache resolution/download to find exact fingerprint candidates across source SHAs, revalidate candidate bytes, and fall back per target; verify hit, expiry, and mismatch scenarios

## 3. Separate source verification from target construction

- [x] 3.1 Add verification receipt contract tests and implement trusted receipt resolution, including exact-fingerprint prior-SHA reuse and PR trust rejection
- [x] 3.2 Add the automatic reusable Linux/Windows/macOS verifier with pinned runners/actions and path filters; verify its semantic workflow contract tests pass
- [x] 3.3 Slim the manual prebuild matrix to build/package/platform smoke and consume verification evidence before matrix creation; verify common gates occur only in the verifier
- [x] 3.4 Emit and stage result v3 with built/reused per-target evidence, then update sync and release preparation to reject legacy results; verify packaging tests pass

## 4. Align governed documentation

- [x] 4.1 Update prebuild and release Skills to the current v3 evidence workflow and verify their instructions contain no obsolete executable path
- [x] 4.2 Update the pending R9a prebuild delta/task references to consume this change and verify the two active changes no longer prescribe conflicting result schemas
- [x] 4.3 Run strict OpenSpec validation and update this task list with the completed implementation evidence

## 5. Validate and produce remote evidence

- [x] 5.1 Run focused TypeScript/Rust tests, fmt, clippy, typecheck, parity/license/package gates, and full Rust workspace tests; record every unavailable or failing gate
- [x] 5.2 Commit and push the complete change to its configured development branch, then verify the automatic Linux/Windows/macOS receipt succeeds for the exact pushed SHA
- [x] 5.3 Dispatch one new uniquely identified seven-target prebuild, validate its v3 result and immutable set, synchronize all targets atomically, and pass the local freshness gate

## Implementation evidence

- OpenSpec strict validation passed for this change and `stabilize-synthesis-r9a-retirement-baseline`.
- TypeScript typecheck, scoped ESLint/Prettier, Rust fmt, workspace clippy with warnings denied, and the 12-case sidecar packaging/governance suite passed.
- The full Rust workspace passed with `--no-fail-fast`, including process integration tests. The formerly sleep-based WebDAV race test passed five focused repetitions after moving to observable generation synchronization.
- Cross-language, native runtime, durable foundation, typed application, citation/reference, tag/concept/topic graph, checkpoint/bundle/WebDAV/debug, and Rust license gates passed. The license gate now follows its source-verification owner instead of depending on the manual prebuild job layout.
- Exact-SHA verifier run `33166330625` passed on Linux, Windows, and macOS for pushed commit `c4278f137798fdd67824402024b1d17985d61bbb` and emitted the trusted receipt consumed by prebuild.
- Seven-target prebuild run `33167146777` passed and published aggregate `ac76cb33e90150d655411d2b2c2e6e8cb7c742ee0413e45b1cbf00127679c3e0` at immutable commit `aef8c6e987c6b6558659844c0b942a39a11ff21e`; strict v3 result/set validation, atomic local synchronization, freshness, and XPI checks passed.
