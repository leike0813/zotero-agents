> Lifecycle boundary: preserve the fixed XPI installer, Rust packaging,
> launch-scoped discovery, OS lock, and registered-schema-migration backup
> policy. Do not restore pointers, rollback, cutover, admission, activation,
> owner/lease files, or persisted generations.

> Local verification note (2026-08-29): source retirement and native-only
> tests pass. The packaged seven-target set is structurally valid but stale:
> expected build fingerprint `ec5f0aaa64b387169df94493240c7042a6c093859a5d1f04383cdd75df343cbc`,
> packaged fingerprint `259a1c55569c382976c7b4ee74039102f01ad7214fb23139fd0bf859ac8dc8bd`.
> Tasks that require a refreshed candidate remain open and belong to the
> separately authorized acceptance handoff.

## 1. Verify Preconditions and Freeze the Retirement Inventory

- [x] 1.1 Verify `stabilize-synthesis-r9a-retirement-baseline`, every task and external parity/10k/25k gate in `restore-synthesis-rust-sidecar-main-parity`, and `remove-synthesis-plugin-legacy-owner` are complete for the same source lineage, with accepted pre-deletion candidate evidence and zero plugin legacy owner construction
- [x] 1.2 Record the source commit, Rust toolchain/Cargo lock, native fingerprints, `apps/synthesis-service` file list, JavaScript worker list, Node-dependent scripts/tests, workspace/dependencies, workflow/release paths, and current package/XPI inventories
- [x] 1.3 Build a reviewed evidence map assigning every stable Node-dependent invariant to a surviving language-neutral corpus, Rust/public test, or native package gate, and classify Node-private assertions for deletion
- [x] 1.4 Build a reviewed keep/prune map for `packages/synthesis-engine`, `packages/synthesis-application`, and `packages/synthesis-repository` from current callers after plugin legacy removal

## 2. Add Replacement Evidence Before Deletion

- [x] 2.1 Extend existing public production-route and language-neutral corpus tests to own all retained DTO, stable error, ordering, pagination, canonical byte/hash, and operation-surface behavior formerly checked by executable Node comparisons
- [x] 2.2 Extend Rust repository/canonical/application tests to own SQLite PRAGMAs/schema/transaction/savepoint/locking, journal/recovery, durable receipt, reopen, and canonical filesystem invariants
- [x] 2.3 Extend Rust worker/service tests to own framing, bounds, transfer integrity, busy admission, deadlines, cancellation, crash, hang kill, respawn, fuse, shutdown, orphan cleanup, and restart accounting
- [x] 2.4 Extend native source/build/package gates to own operation inventory, fingerprints, toolchain/lock identity, licenses, provenance, SBOM, freshness, smoke, and size
- [x] 2.5 Run the replacement matrix while Node source still exists and prove every retained stable invariant has a passing non-Node owner

## 3. Retire Node-Dependent Tests, Scripts, and Suite Governance

- [x] 3.1 Remove Node imports from surviving contract, parity, benchmark, smoke, and test entrypoints; delete wrappers whose evidence is already owned by a stable corpus or Rust/native gate
- [x] 3.2 Delete tests that assert Node private classes, module resolution, emitted ESM extensions, internal call order/messages, or obsolete source/compiled Worker parity
- [x] 3.3 Rename `synthesis-sidecar-stage1-node-suite.ts`, package scripts, CI labels, and governance tests to current Rust/native Stage-1 terminology without retaining aliases
- [x] 3.4 Rebuild the Stage-1 suite inventory so every surviving member verifies public/native/recovery/package behavior and no missing number is hidden by a skipped or placeholder test
- [x] 3.5 Remove Node-only benchmark commands; retain or rename a benchmark only when its metric remains an accepted Rust performance/resource gate

## 4. Delete the External Node Sidecar and Worker Stack

- [x] 4.1 Delete the complete `apps/synthesis-service/**` workspace, including HTTP/request/lifecycle/logging/config/entrypoint, repository/canonical/application wrappers, package metadata, and TypeScript configs
- [x] 4.2 Delete JavaScript compute worker pool/protocol/transports, source/compiled worker fixtures, transfer ownership, and Node-only fault/smoke helpers
- [x] 4.3 Verify `.github/workflows/build-synthesis-sidecar-runtime.yml` remains absent; delete all remaining Node download, build, package, install, pointer, rollback, release-asset, and synchronization paths while preserving the native prebuild, verification, and release workflows
- [x] 4.4 Remove `check:synthesis-service`, `build:synthesis-service`, Node-sidecar benchmark/smoke scripts, workspace entries, dependencies, and lockfile records from `package.json` and `package-lock.json`
- [x] 4.5 Confirm no tracked deprecated copy, empty compatibility workspace, JavaScript service shim, generated Node bundle, or re-enable switch remains

## 5. Prune Environment-Neutral TypeScript Packages

- [x] 5.1 Recompute code-graph callers after Node workspace deletion and verify the recorded keep/prune map against current source
- [x] 5.2 Preserve `packages/synthesis-contracts`, all language-neutral contract sets/corpora, and pure plugin-required DTO/canonicalization/projection/Host-boundary logic
- [x] 5.3 Delete zero-caller engine/application/repository implementations, Node adapters, migration-only entrypoints, and redundant exports
- [x] 5.4 Reduce surviving package indexes, tsconfigs, package scripts, and dependencies to their current live surface; delete an entire package only if its approved surface is empty
- [x] 5.5 Run focused plugin/client/UI/Host tests after each package prune group so an accidental pure-helper removal is localized

## 6. Make Delivery and Worker Gates Native-Only

- [x] 6.1 Update worker source/build parity to inventory only Rust source, Cargo inputs, pinned toolchain, lockfile, features, operation mappings, build recipe, licenses, provenance, and binaries
- [x] 6.2 Update candidate smoke to cover every public native compute operation, durable reads, production identity/handshake, and the exact forward capability roster; keep the exact production-operation catalog and one bounded non-mutating RPC from each production surface in the source-bound native production-route gate
- [x] 6.3 Update source/package/XPI inventory checks to require seven manifest-v3 Rust bundles in the fixed `current` installation and reject Node/npm executables or archives, JavaScript service/package trees, v1 manifests, Node entrypoints and legacy runtime pointers, D3 runtime, implementation selectors, stale or undeclared binaries, and fingerprint drift
- [x] 6.4 Enforce the 15 MiB per-target, 75 MiB seven-target aggregate, and 100 MiB final universal XPI compressed budgets
- [ ] 6.5 Prove all native-only gates run successfully with `apps/synthesis-service` and every deleted Node fixture absent

## 7. Local Verification and Documentation

- [x] 7.1 Run strict validation for this change and all modified current specs
- [x] 7.2 Run the full language-neutral production contract/corpus suite, exact capability/ready/dispatcher checks, zero-legacy boundary checks, R9a Core tests, and renamed native Stage-1 suite
- [x] 7.3 Run all surviving TypeScript package/plugin checks, readonly harness tests/build, and production build without starting a development server
- [ ] 7.4 Run Rust format, clippy, workspace tests, repository/canonical/application/worker/service tests, smoke, freshness, license, provenance, SBOM, and local size gates
- [x] 7.5 Scan source, workspaces, scripts, tests, workflows, package outputs, and XPI inputs for forbidden Node/npm/JavaScript service/D3 runtime identities and all implementation selectors
- [x] 7.6 Update the Rust migration plan and active Synthesis architecture, runtime, persistence, packaging, performance, testing, and recovery documentation to current Rust-only state

## 8. Post-Deletion Candidate and Acceptance Handoff

- [ ] 8.1 Under separate execution authorization, build and verify the post-deletion seven-target native candidate for one source/toolchain/lock identity, including fingerprints, SBOM/provenance/licenses, and 15/75 MiB budgets
- [ ] 8.2 Record the candidate identity and results as the input to `complete-synthesis-r9-stage1-acceptance`; do not claim final XPI, installation, recovery, real-machine, R9, or Stage-1 acceptance here
- [x] 8.3 Verify release publication, tags/assets, feed advancement, and Gitee synchronization remain outside this change unless separately and explicitly authorized
