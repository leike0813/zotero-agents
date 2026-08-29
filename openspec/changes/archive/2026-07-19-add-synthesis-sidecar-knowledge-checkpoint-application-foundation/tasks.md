## 1. Contract-first knowledge checkpoint coverage

- [x] 1.1 Add Core 213 red coverage for strict checkpoint DTOs, unknown fields, duplicate IDs, dangling references, bounds, deterministic normalization/hash/counts, and atomic capture.
- [x] 1.2 Add Core 213 red coverage for preview diffs, user-decision overrides, acknowledgement, receipt single use/supersession/restart/discard/stop invalidation, and shutdown drain.
- [x] 1.3 Add real Node SQLite Core 213 coverage for three-domain commit, row-write rollback, superseded Tag/Concept/Topic basis, operational-row preservation, and last-good index stale marking.

## 2. Shared checkpoint contracts and pure facts

- [x] 2.1 Add strict versioned `SynthesisKnowledgeCheckpoint` request/result/count/basis DTOs and collection bounds to shared contracts.
- [x] 2.2 Add deterministic domain normalization, count calculation, payload hashing, strict verification, and per-family add/update/delete diff helpers.
- [x] 2.3 Reuse existing Tag Vocabulary, Concept KB, and Topic Graph snapshot rebuilders for row validation, identity/reference checks, and basis calculation.
- [x] 2.4 Share semantically identical helpers with production `checkpointExport.ts` and `jsonImport.ts` while preserving public DTOs, canonical per-asset layout, legacy projection fallback, and apply order.

## 3. Shared repository transaction

- [x] 3.1 Add an environment-neutral atomic knowledge capture/replacement repository port spanning the active Tag, Concept, and Topic Graph aggregates.
- [x] 3.2 Implement Node SQLite atomic capture and full replacement with three-basis CAS, complete rollback, and row-write failure propagation.
- [x] 3.3 Preserve Tag staged/audit/pending-effect rows and all three last-good index payloads while marking imported indexes stale.

## 4. Private checkpoint application

- [x] 4.1 Implement `buildCheckpoint` and `verifyCheckpoint` with one admission lease and deterministic metadata.
- [x] 4.2 Implement `previewImport` with one in-process receipt, bound bases/hash, normalized per-family diff, and user-decision override reporting.
- [x] 4.3 Implement `applyImport` with receipt/hash/full-replacement acknowledgement, consume-before-attempt semantics, and one atomic repository commit.
- [x] 4.4 Implement `discardImport`, `stopAdmission`, and `shutdown` with receipt invalidation, new-work rejection, and active-operation drain.

## 5. Node composition and compatibility boundaries

- [x] 5.1 Compose the private checkpoint coordinator after repository recovery and stop/drain it before domain applications, worker pool, and SQLite close.
- [x] 5.2 Extend Core 147 and 148 to lock production JSON import/checkpoint behavior and Core 168 and 193 to lock private composition, packaging, and `108 methods / 1 direct consumer`.
- [x] 5.3 Retain Core 146, 158, 159, and 184 repository/durable-sync/WebDAV behavior without adding a public worker operation or capability.

## 6. Packaging, documentation, and verification

- [x] 6.1 Include checkpoint modules in package exports, service build, runtime bundle, XPI inventory, fingerprint, and isolated migration inventory.
- [x] 6.2 Update current-state README, Synthesis knowledge-graph/runtime/persistence documentation, and Stage 1 WS5 progress.
- [x] 6.3 Run focused Core suites, package/service/root TypeScript, service boundaries, Synthesis invariants, Prettier, ESLint, help-doc, production build, runtime/XPI fail-closed checks, and `git diff --check`.
- [x] 6.4 Run strict OpenSpec validation and implementation verification, resolving every critical or warning mismatch before completion.
