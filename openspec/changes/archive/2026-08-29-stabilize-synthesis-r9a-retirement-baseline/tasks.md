> Lifecycle note: tasks concerning cutover receipts, runtime admission,
> activation, critical smoke, owner/lease files, or generations were superseded
> by `simplify-xpi-owned-synthesis-sidecar-lifecycle` and must not be replayed.

## 1. Freeze the Current R9a Baseline

- [x] 1.1 Record the source commit, current 96-operation manifest/fingerprint, TypeScript and Rust ready rosters, seven surface corpus identities, retained plugin/Node deletion inventory, and the existing focused-gate results
- [x] 1.2 Confirm `remove-synthesis-plugin-legacy-owner` and `remove-synthesis-node-sidecar-stack` reference this change as a prerequisite and do not duplicate its inventory or acceptance rules

## 2. Make Production Inventory Evidence Archival-Safe

- [x] 2.1 Extend the existing production-capability and surface-parity tests so they fail for active/archive path reads, missing/duplicate/unknown operations, wrong surface membership, missing boundary cases, incomplete mutation reopen evidence, dispatcher drift, and ready-roster drift
- [x] 2.2 Change `check-synthesis-production-capabilities.ts` to derive the exact partition from the seven durable contract-set corpora and remove all reads of OpenSpec operation matrices or task files
- [x] 2.3 Change all seven `check-synthesis-*-surface-parity.ts` checkers to use stable corpus identities and current production manifests without active change paths
- [x] 2.4 Keep the 96-operation manifest, operation metadata, TypeScript capability/ready rosters, Rust declared/ready rosters, and dispatcher handler set in one exact comparison with no missing, duplicate, or unknown entry
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
- [x] 5.4 Run Rust format, clippy, workspace tests, worker/service smoke, and local package freshness/size gates
- [x] 5.5 Confirm every required local gate still passes after the change is archived or through the equivalent test-owned archival simulation

## 6. Pre-Deletion Decision Gate

- [x] 6.1 Under separate execution authorization, run the read-only seven-platform native candidate for one source/toolchain/lock identity and record target fingerprints and compressed sizes
- [x] 6.2 Under separate execution authorization, run the agreed representative clean-machine Zotero checks and bind their outcomes to the same source identity
- [x] 6.3 Record candidate evidence as pre-deletion evidence only, with signing, final XPI, upgrade/offline install, release, Stage-1 completion, and Gitee explicitly still pending
- [x] 6.4 Materialize all seven bundles at `addon/bin/<target>/synthesis-sidecar/`, remove the obsolete sidecar-first root, and verify synchronization preserves sibling native binaries
- [x] 6.5 Do not begin `remove-synthesis-plugin-legacy-owner` until sections 1-5 pass and the section 6 decision gate is explicitly accepted

## 7. Repair Clean-Profile Runtime Acceptance

- [x] 7.1 Extend existing cutover, backup, lifecycle, supervisor, and direct-launcher tests for empty, partial, single-root, and non-terminal drain behavior
- [x] 7.2 Implement Rust-owned empty production basis creation and bind `empty-profile` through backup, preflight, receipt, and recovery
- [x] 7.3 Replace ambiguous runtime-root strings with one expanded sidecar runtime path and prove the nested layout is unreachable
- [x] 7.4 Keep startup reconcile behind native mutation admission and restore default-client acquisition after a cutover generation drain

## 8. Complete Reverse-Host Framing and Real-Profile Repair

- [x] 8.1 Add direct-launcher packaged-runtime preflight and Zotero stream forwarding
- [x] 8.2 Repair reverse-Host UTF-8 response framing, forbid fallback responses after transfer starts, and discard failed reference-refresh preparations
- [x] 8.3 Verify focused TypeScript/Rust tests, packaging gates, production build, and repeat the clean-profile real-machine check
  - Focused tests, release elision, production/direct build, XPI inventory, empty-profile real-machine startup, all public Workbench surfaces, Task Manager diagnostics, and admitted cold restart pass locally.
  - Seven-platform runtime freshness remains pending the separately governed prebuild for source fingerprint `5fb7e92c4729b5267288b423fa27e8d1bf07a65dac1725957d52f0f55e5274a0`.
  - Advanced Matching real-engine DTO, application parity, atomic promotion, Sidecar audit projection, and focused Rust/TypeScript/UI gates pass locally; representative clean-profile rerun remains pending.

## 9. Repair Citation Graph Native Command Boundary

- [x] 9.1 Add failing composition and Rust boundary tests for all six public Citation Graph mutation DTOs, including strict empty arguments for full rebuild, incremental refresh, and retry
- [x] 9.2 Move Host collection and internal worker-request construction behind the Rust command adapter, with shared snapshot, cursor, duplicate, bound, and deterministic-order validation
- [x] 9.3 Add atomic source-slice promotion, durable full/incremental retry intent, no-delta full fallback, and last-good preservation across Host, worker, and compare-and-swap failures
- [x] 9.4 Extend reverse-Host and native-surface evidence, update current Citation Graph specifications, and run the focused TypeScript/Rust and surface-parity gates

## 10. Repair Citation Graph Native Read and UI Projection

- [x] 10.1 Add failing real-sidecar evidence for refresh, rebuild, Workbench graph rendering, public read DTOs, layout coordinates, and reopen persistence
- [x] 10.2 Add one coherent native Citation Graph projection for Workbench and all six public read capabilities, including semantic main/hover slices and topic scopes
- [x] 10.3 Normalize worker layout results before persistence, reject stale raw layouts, preserve last-good graph visibility, and bound worker/UI title input
- [x] 10.4 Update current specifications and run the focused TypeScript, Rust, surface-parity, production-capability, and OpenSpec gates

## 11. Repair Advanced Matching

- [x] 11.1 Add failing application and real-child-worker tests for paged binding/dedupe transport, strict requests, identifier parity, explicit accept/review disposition, and same-run accepted-binding exclusion
- [x] 11.2 Route deterministic in-memory calls through the generic paged worker protocol, replace the broken native matcher adapter with one two-pass DTO boundary, and preserve atomic durable promotion without Node or plugin fallback
- [x] 11.3 Add failing native and TypeScript tests for successful and non-success Advanced Matching terminals, including zero-result passes
- [x] 11.4 Run focused Rust/TypeScript, surface-parity, OpenSpec, format, clippy, and type-check gates and record the local result without claiming pending real-machine or prebuild evidence
- [x] 11.5 Normalize Rust dedupe actions by the TypeScript semantic action identity, carry stable semantic keys through both matcher passes, and reject only exact semantic duplicates before atomic promotion
- [x] 11.6 Add same-pair edge-type and best-score regression/parity evidence, require the production Rust route to promote, and rerun the focused matcher, application, contract, fixture, and OpenSpec gates

## 12. Rebind the Current Source Before R9b Retirement

- [x] 12.1 Extend the existing native ownership gate and real-process coverage so canonical topic inspection preserves its public descriptor while HTTP ingress cannot acquire the canonical owner or storage lock
- [x] 12.2 Add narrow canonical store identity/descriptor methods to the existing `CanonicalStorePort`, route ingress through them, and move transfer reservation/execution/terminal orchestration behind the existing transfer module without adding a new owner or forwarding trait
- [x] 12.3 Repair release finalization for all seven `addon/bin/<target>/synthesis-sidecar/` directories, add a non-publishing dry-run test, and correct active R9b manifest-v3/seven-target documentation
- [x] 12.4 Run the current-source Rust, TypeScript, production capability, seven surface, four application differential, Stage-1, full core, 2k/10k/25k, production-build, packaging, OpenSpec, formatting, and whitespace gates and record the exact source/toolchain/lock/fingerprint result
  - Current governed source identity: baseline commit `455d54046148be9ed60886bcb83efe606146a175` plus the current worktree, build fingerprint `90f04bf329c52a32c87bc31678539a439fac18f86ab1a9aea3bae34efbf30bc1`, capability fingerprint `f6841847f743b3a63bf7731f7bab32b869e9f7b75647b739f3dceed33fe68523`, `nightly-2026-07-25` / `rustc 1.99.0-nightly (da86f4d07 2026-07-24)`, and Cargo lock SHA-256 `5f4f34013784c8ecf40105e16ac54a2b7f9a7b484c6401e28a6cae49e70a0599`.
  - Rust format, all-target Clippy with warnings denied, 283 locked workspace tests, the 56-file Stage-1 suite, full Node core (`3484 passing`, `17 pending`), production build, 96-operation capability inventory, seven surface gates, four 53-table application differentials, packaging behavior tests, license inventory, strict OpenSpec validation, and whitespace checks pass.
  - The unchanged formal 2k/10k/25k production-route performance gate passes on an idle rerun, including graph, Reference one-snapshot, tag batching, and RSS sub-gates. Earlier runs recorded a 10k Reference refresh outlier (`p95 2546.6 ms`) above the unchanged `2500 ms` budget while the isolated run passed (`p95 2365.0 ms`); this near-budget variance remains a follow-up risk. No sample, percentile, dataset, or budget was weakened.
  - Current seven-platform package freshness remains open: all packaged manifests are from the stale capability set, and the `linux-x64` current bundle has no executable, so the native-only XPI inventory also fails. These artifacts require task 12.5's governed prebuild and synchronization.
- [x] 12.5 After `decouple-synthesis-sidecar-prebuild-verification` produces one build-only v4 result and formal release preparation joins it with matching verification v2 evidence under separate execution authorization, replace the stale eight-capability bundles with the release-set v2's exact seven-platform content-addressed candidate and prove freshness, licenses, provenance, SBOM, per-target size, aggregate size, and native-only XPI inventory
- [x] 12.6 Bind Zotero 7 and Zotero 9 clean-profile and existing-data representative results to the same frozen source identity; only then accept the pre-deletion decision gate
