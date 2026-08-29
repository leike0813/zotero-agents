## 1. Catalog Contract Tests

- [x] 1.1 Add catalog-interface tests for manifest order, membership, independent fingerprint recomputation, and a complete valid route inventory
- [x] 1.2 Add aggregated diagnostic tests covering missing, duplicate, undeclared, policy-less, and invalid-plan routes without locking complete error prose
- [x] 1.3 Add representative execution tests for inline, transfer input/output, artifact delivery, maintenance start/resume, and every canonical-effect result shape

## 2. Deep Production Client Module

- [x] 2.1 Move embedded manifest DTOs, policy validation, and operation metadata into `runtime_production_client`
- [x] 2.2 Implement SHA-256 fingerprint recomputation, deterministic aggregated diagnostics, immutable catalog lookup, and narrow membership access
- [x] 2.3 Implement the closed execution plan and direct request execution while preserving current deadlines, receipts, transfer ordering, and error mapping

## 3. Route and Runtime Migration

- [x] 3.1 Replace the six surface registration macros and local dispatchers with ordinary static route entry slices
- [x] 3.2 Replace canonical-autosync capability matching with closed canonical-effect evaluation plus the existing dynamic write-count and maintenance-epoch behavior
- [x] 3.3 Inject the production runtime into `ServeState`, share transfer ownership, delegate transfer membership, and preserve shutdown release order
- [x] 3.4 Delete the unused public `production_capabilities` module, its `lib.rs` export, fixed route-count/ready-roster evidence, and duplicated Rust fingerprint constant

## 4. Contract Checker Migration

- [x] 4.1 Remove Rust source-shape, ready-roster, digest-constant, macro, and fixed-count assumptions from the production-capability checker
- [x] 4.2 Update focused Node tests to retain manifest, grouped-client, operation-policy, surface-corpus, and observable route evidence without testing Rust implementation text

## 5. Verification

- [x] 5.1 Run focused Rust tests through the catalog and execution interfaces, then run the complete Rust sidecar workspace test suite
- [x] 5.2 Run Rust format check and Clippy with warnings denied
- [x] 5.3 Run production capability and route-performance checkers plus focused Node tests 220 and 230–235
- [x] 5.4 Run strict OpenSpec validation, `git diff --check`, and confirm no unintended lockfile, release, prebuild, or publication changes
