## 1. Freeze the Current R9a Baseline

- [x] 1.1 Record the source commit, current 95-operation manifest/fingerprint, TypeScript and Rust ready rosters, seven surface corpus identities, retained plugin/Node deletion inventory, and the existing focused-gate results
- [x] 1.2 Confirm `remove-synthesis-plugin-legacy-owner` and `remove-synthesis-node-sidecar-stack` reference this change as a prerequisite and do not duplicate its inventory or acceptance rules

## 2. Make Production Inventory Evidence Archival-Safe

- [x] 2.1 Extend the existing production-capability and surface-parity tests so they fail for active/archive path reads, missing/duplicate/unknown operations, wrong surface membership, missing boundary cases, incomplete mutation reopen evidence, dispatcher drift, and ready-roster drift
- [x] 2.2 Change `check-synthesis-production-capabilities.ts` to derive the exact partition from the seven durable contract-set corpora and remove all reads of OpenSpec operation matrices or task files
- [x] 2.3 Change all seven `check-synthesis-*-surface-parity.ts` checkers to use stable corpus identities and current production manifests without active change paths
- [x] 2.4 Keep the 95-operation manifest, operation metadata, TypeScript capability/ready rosters, Rust declared/ready rosters, and dispatcher handler set in one exact comparison with no missing, duplicate, or unknown entry
- [x] 2.5 Run the capability and seven surface checkers after temporarily exercising the test-owned “no active change directory” fixture and confirm the same evidence remains reproducible

## 3. Complete Critical Smoke Before Mutation Admission

- [x] 3.1 Extend the existing cutover/activation tests with the complete ordered smoke roster, typed empty-profile branches, stale identity, omitted/duplicated check, unknown roster version, worker deadline/crash, partial response, replay, and pre-admission recovery cases
- [x] 3.2 Implement stable smoke check IDs and bounded checks for identity, storage, Workbench chrome, Topic list, Topic detail/empty, canonical manifest/status, reference/cache status, graph read/empty, and one non-destructive worker operation
- [x] 3.3 Normalize each check result into identity-bound observable evidence that excludes messages, logs, timestamps, incidental ordering, and private implementation fields
- [x] 3.4 Bind the aggregate digest to roster version, ordered check IDs, per-check digests, receipt, profile, service instance, owner identity, and capability fingerprint
- [x] 3.5 Make Rust activation reject partial, stale, replayed, duplicated, unknown-version, or identity-mismatched smoke evidence before opening the mutation gate
- [x] 3.6 Verify pre-admission smoke failure stops the native owner and follows the existing verified reversal/restore path without invoking plugin or Node fallback

## 4. Correct Current-State Documentation

- [x] 4.1 Update `artifact/synthesis_sidecar_rust_migration_plan_20260718.md` to describe complete local R9a routing/ownership, this acceptance repair, the two dependent R9b changes, and pending external evidence
- [x] 4.2 Update `doc/synthesis-layer/README.md`, `runtime-and-rebuild.md`, `persistence-and-files.md`, runtime supervision/packaging docs, and any other active page that still describes production ownership or route readiness incorrectly
- [x] 4.3 Document the exact retained plugin legacy and external Node inventories without claiming that either has already been deleted

## 5. Local Verification

- [x] 5.1 Run strict validation for this change and the modified current specs
- [x] 5.2 Run production capability, seven surface parity, service-boundary, R9a Core 219-235, and relevant Stage-1 tests
- [x] 5.3 Run TypeScript package/plugin checks and the production build without starting a development server
- [ ] 5.4 Run Rust format, clippy, workspace tests, worker/service smoke, and local package freshness/size gates
- [x] 5.5 Confirm every required local gate still passes after the change is archived or through the equivalent test-owned archival simulation

## 6. Pre-Deletion Decision Gate

- [ ] 6.1 Under separate execution authorization, run the read-only five-platform native candidate for one source/toolchain/lock identity and record target fingerprints and compressed sizes
- [ ] 6.2 Under separate execution authorization, run the agreed representative clean-machine Zotero checks and bind their outcomes to the same source identity
- [ ] 6.3 Record candidate evidence as pre-deletion evidence only, with signing, final XPI, upgrade/offline install, release, Stage-1 completion, and Gitee explicitly still pending
- [ ] 6.4 Do not begin `remove-synthesis-plugin-legacy-owner` until sections 1-5 pass and the section 6 decision gate is explicitly accepted
