## 1. Freeze the Post-Retirement Candidate

- [x] 1.1 Confirm both R9b retirement changes are archived; pin one pushed source commit, the governed build recipe/toolchain, Cargo lock digest, prebuild/verification workflow revisions, and current compatibility-matrix revision
- [x] 1.2 Map prebuild v4, verification v2, bundle manifests, XPI digest, compatibility receipts, and Run Manifests to one candidate; identify any missing evidence fields before adding a collector or validator
- [x] 1.3 Record the current blocking and nonblocking environment cells, privacy-safe evidence fields, isolated-root/cleanup owners, and explicit release-publication exclusions before dispatch

## 2. Build and Verify the Seven Native Bundles

- [x] 2.1 Under the applicable authorization, dispatch or resume the governed seven-target prebuild for the pinned pushed source; obtain its trusted v4 result and matching verification v2 receipt, or record missing verification as pending
- [x] 2.2 Synchronize the content-addressed bundle set into the candidate add-on tree and verify all seven bundles advance transactionally without changing unrelated native assets
- [x] 2.3 Verify manifest v3, executable hashes, source fingerprints, provenance, Cargo-lock-matched `licenses.json`, native smoke/handshake signature status (`unsigned-candidate` on Windows/macOS; `not-applicable` on Linux), freshness, and the 15/75 MiB budgets through the governed prebuild/verification and package checks; repeat for any source-changed candidate

## 3. Assemble the Universal XPI

- [x] 3.1 Build one unpublished production universal XPI and verify it contains the exact seven native bundles and no Node/npm/JavaScript service/D3 runtime/selector artifacts
- [x] 3.2 Pin its SHA-256 digest; verify package inventory, per-target identities, and the 100 MiB compressed budget against the source-bound build evidence
- [x] 3.3 Confirm the governed immutable prebuild set and run-scoped evidence artifacts are the only remote outputs; no release tag/asset, feed advancement, mutable production pointer, or Gitee synchronization occurs

## 4. Exercise Installation, Upgrade, and Data Safety

- [ ] 4.1 Install the pinned XPI into isolated clean-profile and offline cases; verify its digest, authenticated readiness, representative reads, shutdown, and restart
- [ ] 4.2 Run existing-profile and XPI-upgrade cases on isolated copies; verify the pinned XPI replaces current runtime atomically and preserves unrelated profile data and inert legacy lifecycle files
- [ ] 4.3 Run corrupt, stale, and wrong-platform bundle cases and verify fail-closed behavior leaves the previous runtime usable
- [ ] 4.4 Run registered migration success, backup failure, migration failure, unknown-variant, and retry cases on isolated profile copies and verify original source hashes remain unchanged

## 5. Exercise Real Process Recovery

- [ ] 5.1 Run authenticated shutdown and parent-input EOF cases and verify response flush, discovery removal, bounded drain, process exit, and zero orphan state
- [ ] 5.2 Run pre-ready and post-ready crash, bounded restart, fuse, forced-termination, and explicit recovery cases and verify one causal terminal result per generation
- [x] 5.3 Run production-lock conflict and subsequent owner-release cases and verify the losing process never opens storage while the existing owner remains healthy
- [ ] 5.4 Rehearse the operator runbook for compatible restart, repair, forward migration, and stopped-service restore and record the observable outcomes
- [x] 5.5 Repair stale discovery cleanup across previous session roots after a forced host-owner death; verify the lock winner clears it before readiness, a live lock loser leaves it intact, and the HB-03 real-machine case passes on rebuilt candidate bytes

## 6. Run the Current Zotero Compatibility Matrix

- [x] 6.1 Run the acceptance lane's Zotero 7/9/10 Linux x64 cells with the pinned XPI and promoted Phase 1 System E2E catalog; verify Run Manifest, cleanup, health, and installed sidecar evidence
- [ ] 6.2 Run the matching acceptance-lane Zotero 7/9/10 Windows x64 cells with the same XPI and evidence checks; record macOS Zotero 10 XPI-smoke results separately under their current nonblocking policy
- [ ] 6.3 Compare each cell's installed XPI SHA-256 and selected bundle identity with the pinned candidate; adapt the existing runner if it cannot report those facts, and leave missing or restaged-byte evidence pending

## 7. Decide and Document Acceptance

- [x] 7.1 Run strict OpenSpec validation and a read-only decision over existing receipts plus the uncovered-case evidence; reject missing, stale, mixed-source, or different-XPI results
- [x] 7.2 Update current Synthesis migration, packaging, lifecycle, recovery, testing, and audit documents with the actual source-bound results and remaining gaps
- [x] 7.3 Declare R9 and Stage 1 complete only when every required receipt passes for one identity; otherwise record the exact failed or pending gates
- [x] 7.4 Confirm release publication, release tags/assets, feed advancement, production pointers, and Gitee synchronization remain outside this change
