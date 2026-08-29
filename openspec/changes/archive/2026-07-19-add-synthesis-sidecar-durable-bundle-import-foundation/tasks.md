## 1. Strict Import Contracts

- [x] 1.1 Add Core 215 fixtures for all live payload kinds, v1/v2 preview, deterministic diff, conflicts, tombstones, receipts, and sync-index validation
- [x] 1.2 Add strict import preview/apply, conflict, diagnostic, receipt, and sync-index DTOs with derived bounds to `synthesis-contracts`
- [x] 1.3 Implement the live-kind validator/identity/mutation registry and shared base/local/remote classifier
- [x] 1.4 Export the contract surface and pass contract-focused Core 215 plus package TypeScript

## 2. Complete Repository Import Unit Of Work

- [x] 2.1 Extend Core 146/215 for auxiliary durable owners, complete capture, expected aggregate/index basis, incremental preservation, stale projections, and commit receipts
- [x] 2.2 Add Topic interest, discovery hint, and Related Items effect schemas/rebuilders in their domain repository families
- [x] 2.3 Add strict isolated sync-index and durable import commit receipt storage with migration and recovery inspection
- [x] 2.4 Implement one expected-basis durable import transaction and extend complete export capture to the added owners

## 3. Canonical Markdown And Batch Recovery

- [x] 3.1 Extend Core 205/214/215 with safe Markdown round-trip, full-current hashes, batch staging, CAS failure, crash phases, forward recovery, and repair-required cases
- [x] 3.2 Extend the canonical snapshot/store model with bounded safe Markdown while preserving the public inspect DTO
- [x] 3.3 Implement strict multi-Topic stage, fsync, journal, synchronous forward promotion, cleanup, and recovery decisions in the designated Node adapter
- [x] 3.4 Reuse canonical batch/current SSOT from durable export and import composition without adding filesystem authority elsewhere

## 4. Private Import Application

- [x] 4.1 Implement `previewImport`, one pinned receipt, deterministic diff/conflicts, tombstone blocking, and unbased-update acknowledgement
- [x] 4.2 Implement receipt-consuming `applyImport` and `discardImport` over repository CAS plus canonical stage/commit/recovery
- [x] 4.3 Share the existing durable application lease, clear receipts on stop, and drain before canonical/repository closure
- [x] 4.4 Compose recovery after repository/canonical recovery and before readiness without adding a public route or worker operation

## 5. Production Compatibility And Packaging

- [x] 5.1 Extend Core 158 for exact valid preview/apply/index behavior and delegate production pure normalization/conflict/index logic to the shared foundation
- [x] 5.2 Run Core 159/184 to lock WebDAV HEAD/ETag, retry/conflict, credentials, autosync, and Host port behavior
- [x] 5.3 Extend Core 168/193 for private capability, recovery/readiness, close ordering, migration inventory, fingerprints, runtime/XPI paths, and `108 methods / 1 direct consumer`
- [x] 5.4 Update package/service TypeScript inputs, exports, runtime inventories, migration inventory, and release fingerprints

## 6. Documentation And Verification

- [x] 6.1 Update README, persistence, runtime, WebDAV, sequence/state-machine, and Stage 1 WS5 current-state documentation
- [x] 6.2 Run package/service/root TypeScript, Synthesis boundaries/invariants, Prettier, ESLint, help-doc, and focused Core suites
- [x] 6.3 Run production build, runtime/XPI fail-closed checks, `git diff --check`, and strict OpenSpec validation
