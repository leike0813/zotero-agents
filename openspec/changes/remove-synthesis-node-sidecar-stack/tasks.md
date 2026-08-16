> Lifecycle boundary: preserve the fixed XPI installer, Rust packaging,
> launch-scoped discovery, OS lock, and registered-schema-migration backup
> policy. Do not restore pointers, rollback, cutover, admission, activation,
> owner/lease files, or persisted generations.

## 1. Verify Preconditions and Freeze the Retirement Inventory

- [ ] 1.1 Verify `stabilize-synthesis-r9a-retirement-baseline`, every task and external parity/10k/25k gate in `restore-synthesis-rust-sidecar-main-parity`, and `remove-synthesis-plugin-legacy-owner` are complete for the same source lineage, with accepted pre-deletion candidate evidence and zero plugin legacy owner construction
- [ ] 1.2 Record the source commit, Rust toolchain/Cargo lock, native fingerprints, `apps/synthesis-service` file list, JavaScript worker list, Node-dependent scripts/tests, workspace/dependencies, workflow/release paths, and current package/XPI inventories
- [ ] 1.3 Build a reviewed evidence map assigning every stable Node-dependent invariant to a surviving language-neutral corpus, Rust/public test, or native package gate, and classify Node-private assertions for deletion
- [ ] 1.4 Build a reviewed keep/prune map for `packages/synthesis-engine`, `packages/synthesis-application`, and `packages/synthesis-repository` from current callers after plugin legacy removal

## 2. Add Replacement Evidence Before Deletion

- [ ] 2.1 Extend existing public production-route and language-neutral corpus tests to own all retained DTO, stable error, ordering, pagination, canonical byte/hash, and operation-surface behavior formerly checked by executable Node comparisons
- [ ] 2.2 Extend Rust repository/canonical/application tests to own SQLite PRAGMAs/schema/transaction/savepoint/locking, journal/recovery, durable receipt, reopen, and canonical filesystem invariants
- [ ] 2.3 Extend Rust worker/service tests to own framing, bounds, transfer integrity, busy admission, deadlines, cancellation, crash, hang kill, respawn, fuse, shutdown, orphan cleanup, and restart accounting
- [ ] 2.4 Extend native source/build/package gates to own operation inventory, fingerprints, toolchain/lock identity, licenses, provenance, SBOM, freshness, smoke, and size
- [ ] 2.5 Run the replacement matrix while Node source still exists and prove every retained stable invariant has a passing non-Node owner

## 3. Retire Node-Dependent Tests, Scripts, and Suite Governance

- [ ] 3.1 Remove Node imports from surviving contract, parity, benchmark, smoke, and test entrypoints; delete wrappers whose evidence is already owned by a stable corpus or Rust/native gate
- [ ] 3.2 Delete tests that assert Node private classes, module resolution, emitted ESM extensions, internal call order/messages, or obsolete source/compiled Worker parity
- [ ] 3.3 Rename `synthesis-sidecar-stage1-node-suite.ts`, package scripts, CI labels, and governance tests to current Rust/native Stage-1 terminology without retaining aliases
- [ ] 3.4 Rebuild the Stage-1 suite inventory so every surviving member verifies public/native/recovery/package behavior and no missing number is hidden by a skipped or placeholder test
- [ ] 3.5 Remove Node-only benchmark commands; retain or rename a benchmark only when its metric remains an accepted Rust performance/resource gate

## 4. Delete the External Node Sidecar and Worker Stack

- [ ] 4.1 Delete the complete `apps/synthesis-service/**` workspace, including HTTP/request/lifecycle/logging/config/entrypoint, repository/canonical/application wrappers, package metadata, and TypeScript configs
- [ ] 4.2 Delete JavaScript compute worker pool/protocol/transports, source/compiled worker fixtures, transfer ownership, and Node-only fault/smoke helpers
- [ ] 4.3 Delete `.github/workflows/build-synthesis-sidecar-runtime.yml` and all Node download, prebuild, package, install, pointer, rollback, release-asset, and synchronization paths
- [ ] 4.4 Remove `check:synthesis-service`, `build:synthesis-service`, Node-sidecar benchmark/smoke scripts, workspace entries, dependencies, and lockfile records from `package.json` and `package-lock.json`
- [ ] 4.5 Confirm no tracked deprecated copy, empty compatibility workspace, JavaScript service shim, generated Node bundle, or re-enable switch remains

## 5. Prune Environment-Neutral TypeScript Packages

- [ ] 5.1 Recompute code-graph callers after Node workspace deletion and verify the recorded keep/prune map against current source
- [ ] 5.2 Preserve `packages/synthesis-contracts`, all language-neutral contract sets/corpora, and pure plugin-required DTO/canonicalization/projection/Host-boundary logic
- [ ] 5.3 Delete zero-caller engine/application/repository implementations, Node adapters, migration-only entrypoints, and redundant exports
- [ ] 5.4 Reduce surviving package indexes, tsconfigs, package scripts, and dependencies to their current live surface; delete an entire package only if its approved surface is empty
- [ ] 5.5 Run focused plugin/client/UI/Host tests after each package prune group so an accidental pure-helper removal is localized

## 6. Make Delivery and Worker Gates Native-Only

- [ ] 6.1 Update worker source/build parity to inventory only Rust source, Cargo inputs, pinned toolchain, lockfile, features, operation mappings, build recipe, licenses, provenance, and binaries
- [ ] 6.2 Update candidate smoke to cover all native compute operations, durable reads, production identity/handshake, exact 96-operation ready roster, and one bounded non-mutating RPC from each production surface
- [ ] 6.3 Update source/package/XPI inventory checks to require seven manifest-v3 Rust bundles in the fixed `current` installation and reject Node/npm executables or archives, JavaScript service/package trees, v1 manifests, Node entrypoints and legacy runtime pointers, D3 runtime, implementation selectors, stale or undeclared binaries, and fingerprint drift
- [ ] 6.4 Enforce the 15 MiB per-target, 75 MiB seven-target aggregate, and 100 MiB final universal XPI compressed budgets
- [ ] 6.5 Prove all native-only gates run successfully with `apps/synthesis-service` and every deleted Node fixture absent

## 7. Local Verification and Documentation

- [ ] 7.1 Run strict validation for this change and all modified current specs
- [ ] 7.2 Run the full language-neutral production contract/corpus suite, exact capability/ready/dispatcher checks, zero-legacy boundary checks, R9a Core tests, and renamed native Stage-1 suite
- [ ] 7.3 Run all surviving TypeScript package/plugin checks, readonly harness tests/build, and production build without starting a development server
- [ ] 7.4 Run Rust format, clippy, workspace tests, repository/canonical/application/worker/service tests, smoke, freshness, license, provenance, SBOM, and local size gates
- [ ] 7.5 Scan source, workspaces, scripts, tests, workflows, package outputs, and XPI inputs for forbidden Node/npm/JavaScript service/D3 runtime identities and all implementation selectors
- [ ] 7.6 Update the Rust migration plan and active Synthesis architecture, runtime, persistence, packaging, performance, testing, and recovery documentation to current Rust-only state

## 8. Final R9 and Stage-1 Acceptance

- [ ] 8.1 Under separate execution authorization, build and verify all seven native targets for one source/toolchain/lock identity, including fingerprints, signatures required by the acceptance environment, SBOM/provenance/licenses, and 15/75 MiB budgets
- [ ] 8.2 Assemble and verify the final universal XPI native-only inventory and 100 MiB budget without publishing it
- [ ] 8.3 Run clean-profile and existing-data Zotero tests while proving legacy lifecycle files remain inert
- [ ] 8.4 Run corrupt/wrong-platform bundle, offline install, crash/restart/parent-EOF, production-lock conflict, partial-source, registered-migration backup/failure, and operator runbook cases
- [ ] 8.5 Run representative real-machine smoke on Zotero 7 and Zotero 9 across the agreed platform matrix
- [ ] 8.6 Bind every result to one source identity and report any missing evidence honestly; do not declare R9 or Stage 1 complete while one gate is absent
- [ ] 8.7 Keep release publication, tag/assets, feed advancement, and Gitee synchronization outside this change unless separately and explicitly authorized
