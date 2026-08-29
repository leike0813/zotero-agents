## 1. Freeze the Post-Retirement Candidate

- [ ] 1.1 Verify both R9b retirement changes are locally complete and record the exact source commit, Rust toolchain, Cargo lock digest, workflow identity, and current native fingerprint inputs
- [ ] 1.2 Create the acceptance identity envelope and verify its validator rejects missing, stale, or mixed-source receipts
- [ ] 1.3 Record the authorized environment matrix, privacy-safe receipt schema, cleanup ownership, and explicit publication exclusions before dispatch

## 2. Build and Verify the Seven Native Bundles

- [ ] 2.1 Under separate authorization, dispatch or resume the governed seven-target native prebuild for the pinned source identity and verify every target completes
- [ ] 2.2 Synchronize the content-addressed bundle set into the candidate add-on tree and verify all seven bundles advance transactionally without changing unrelated native assets
- [ ] 2.3 Verify manifest v3, executable hashes, source fingerprints, provenance, SBOM, license inventory, required platform signatures, freshness, smoke, and the 15/75 MiB budgets for all targets

## 3. Assemble the Universal XPI

- [ ] 3.1 Build the production universal XPI without publishing and verify it contains the exact seven native bundles and no Node/npm/JavaScript service/D3 runtime/selector artifacts
- [ ] 3.2 Verify the universal-XPI digest, package inventory, per-target identities, and 100 MiB compressed budget match the acceptance envelope
- [ ] 3.3 Prove no tag, release asset, feed, mutable production pointer, or Gitee synchronization was created

## 4. Exercise Installation, Upgrade, and Data Safety

- [ ] 4.1 Run clean-profile and offline-install cases and verify install, authenticated readiness, representative reads, shutdown, and restart
- [ ] 4.2 Run existing-profile and XPI-upgrade cases and verify atomic current-runtime replacement preserves unrelated profile data and inert legacy lifecycle files
- [ ] 4.3 Run corrupt, stale, and wrong-platform bundle cases and verify fail-closed behavior leaves the previous runtime usable
- [ ] 4.4 Run registered migration success, backup failure, migration failure, unknown-variant, and retry cases on isolated profile copies and verify original source hashes remain unchanged

## 5. Exercise Real Process Recovery

- [ ] 5.1 Run authenticated shutdown and parent-input EOF cases and verify response flush, discovery removal, bounded drain, process exit, and zero orphan state
- [ ] 5.2 Run pre-ready and post-ready crash, bounded restart, fuse, forced-termination, and explicit recovery cases and verify one causal terminal result per generation
- [ ] 5.3 Run production-lock conflict and subsequent owner-release cases and verify the losing process never opens storage while the existing owner remains healthy
- [ ] 5.4 Rehearse the operator runbook for compatible restart, repair, forward migration, and stopped-service restore and record the observable outcomes

## 6. Run the Zotero 7 and Zotero 9 Matrix

- [ ] 6.1 Under separate authorization, run the agreed Zotero 7 real-machine platform cases and verify install, startup, all seven public operation surfaces, shutdown, and restart
- [ ] 6.2 Under separate authorization, run the agreed Zotero 9 real-machine platform cases and verify install, startup, all seven public operation surfaces, shutdown, and restart
- [ ] 6.3 Verify every real-machine receipt matches the pinned candidate identity and report unavailable environments as pending rather than inferred passes

## 7. Decide and Document Acceptance

- [ ] 7.1 Run strict OpenSpec validation and the read-only acceptance evaluator against the complete receipt set
- [ ] 7.2 Update current Synthesis migration, packaging, lifecycle, recovery, testing, and audit documents with the actual source-bound results and remaining gaps
- [ ] 7.3 Declare R9 and Stage 1 complete only when every required receipt passes for one identity; otherwise record the exact failed or pending gates
- [ ] 7.4 Confirm release publication, tags/assets, feed advancement, and Gitee synchronization remain outside this change until separately authorized
