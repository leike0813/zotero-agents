## 1. Native bundle and platform contract

- [x] 1.1 Advance the strict bundle contract to v3, remove signature admission, and add the seven target/triple mappings.
- [x] 1.2 Extend runtime platform detection, package, freshness, XPI, and installer checks to the seven targets.
- [x] 1.3 Add contract and installer regression coverage for v3 rejection, Linux x86/arm detection, and integrity-only production admission.

## 2. Content-addressed prebuild evidence

- [x] 2.1 Add schemas and contract helpers for prebuild manifests/results, release sets, and receipts.
- [x] 2.2 Implement deterministic staging, exact-result synchronization, aggregate validation, and transactional addon materialization.
- [x] 2.3 Add a manual seven-platform prebuild workflow while retaining push candidates as read-only validation.
- [x] 2.4 Cover wrong run/SHA, missing or duplicate archives, digest drift, expired bundles, and rollback behavior.

## 3. Governed release pipeline

- [x] 3.1 Add prepare, plan, dispatch, and receipt-controller scripts plus package commands.
- [x] 3.2 Add the manual `release-synthesis-sidecar.yml` workflow with same-set recovery and source-main finalization.
- [x] 3.3 Gate plugin release on a committed matching complete receipt and remove mutable GitHub Release downloads.

## 4. Candidate and operator coverage

- [x] 4.1 Fix candidate Rust warnings and add protocol-level health-route coverage.
- [x] 4.2 Add Synthesis prebuild and release pipeline Skills with explicit authorization, identity, recovery, and reporting rules.
- [x] 4.3 Update OpenSpec runtime packaging documentation and run focused TypeScript/Rust verification.
