## 1. Canonical Representation TDD

- [x] 1.1 Add failing canonical-store tests for draft preparation equivalence, typed read projection, and opaque promotion inputs
- [x] 1.2 Add failing canonical-store tests for transport-neutral asset round-trip and invalid path/hash/section/bounds classification
- [x] 1.3 Implement draft, prepared write, read projection, canonical asset, and typed error contracts in the existing canonical-store module
- [x] 1.4 Route single promotion, current reads, and import batch staging through the prepared representation without changing persisted bytes or recovery phases
- [x] 1.5 Move transaction identity generation into canonical-store and add parity-only deterministic injection

## 2. Topic Application Seam

- [x] 2.1 Shrink TopicCanonicalPort to typed read, prepared promotion, archive, restore, and purge operations
- [x] 2.2 Migrate Topic create/full/patch to canonical draft preparation and typed results, removing application path/hash/snapshot/transaction construction
- [x] 2.3 Route legacy Topic adoption through the canonical read representation while preserving application-owned normalization and projections
- [x] 2.4 Keep existing Topic application behavior tests green through the new interface and typed error mapping

## 3. Durable Bundle And Runtime Evidence

- [x] 3.1 Move Topic asset capture and decode into canonical-store and reduce CanonicalStorePort to envelope/lock/error adaptation
- [x] 3.2 Migrate DurableBundleApplication to opaque prepared imports without changing receipt, stage, completion, or recovery ownership
- [x] 3.3 Update the typed application parity adapter and feature wiring while preserving the existing corpus and oracle output
- [x] 3.4 Update native process lifecycle fixtures through canonical preparation and preserve discard, roll-forward, and fail-closed evidence

## 4. Current-State Documentation And Cleanup

- [x] 4.1 Update Synthesis ownership, persistence, runtime, and sequence documents for the deepened canonical representation interface
- [x] 4.2 Remove duplicate section naming, public snapshot/promotion construction, and application transaction factories; verify unrelated canonical JSON hashing remains unchanged

## 5. Verification

- [x] 5.1 Run focused canonical-store, application, native process lifecycle, and typed application parity checks
- [x] 5.2 Run Rust formatting, workspace clippy, workspace tests, and strict OpenSpec validation
