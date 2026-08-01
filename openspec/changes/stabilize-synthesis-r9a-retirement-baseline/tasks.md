> Lifecycle note: tasks concerning cutover receipts, runtime admission,
> activation, critical smoke, owner/lease files, or generations were superseded
> by `simplify-xpi-owned-synthesis-sidecar-lifecycle` and must not be replayed.

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
- [x] 5.4 Run Rust format, clippy, workspace tests, worker/service smoke, and local package freshness/size gates
- [x] 5.5 Confirm every required local gate still passes after the change is archived or through the equivalent test-owned archival simulation

## 6. Pre-Deletion Decision Gate

- [x] 6.1 Under separate execution authorization, run the read-only seven-platform native candidate for one source/toolchain/lock identity and record target fingerprints and compressed sizes
- [ ] 6.2 Under separate execution authorization, run the agreed representative clean-machine Zotero checks and bind their outcomes to the same source identity
- [x] 6.3 Record candidate evidence as pre-deletion evidence only, with signing, final XPI, upgrade/offline install, release, Stage-1 completion, and Gitee explicitly still pending
- [x] 6.4 Materialize all seven bundles at `addon/bin/<target>/synthesis-sidecar/`, remove the obsolete sidecar-first root, and verify synchronization preserves sibling native binaries
- [ ] 6.5 Do not begin `remove-synthesis-plugin-legacy-owner` until sections 1-5 pass and the section 6 decision gate is explicitly accepted

## 7. Repair Clean-Profile Runtime Acceptance

- [x] 7.1 Extend existing cutover, backup, lifecycle, supervisor, and direct-launcher tests for empty, partial, single-root, and non-terminal drain behavior
- [x] 7.2 Implement Rust-owned empty production basis creation and bind `empty-profile` through backup, preflight, receipt, and recovery
- [x] 7.3 Replace ambiguous runtime-root strings with one expanded sidecar runtime path and prove the nested layout is unreachable
- [x] 7.4 Keep startup reconcile behind native mutation admission and restore default-client acquisition after a cutover generation drain

## 8. Complete Reverse-Host Framing and Real-Profile Repair

- [x] 8.1 Add direct-launcher packaged-runtime preflight and Zotero stream forwarding
- [x] 8.2 Repair reverse-Host UTF-8 response framing, forbid fallback responses after transfer starts, and discard failed reference-refresh preparations
- [ ] 8.3 Verify focused TypeScript/Rust tests, packaging gates, production build, and repeat the clean-profile real-machine check
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
