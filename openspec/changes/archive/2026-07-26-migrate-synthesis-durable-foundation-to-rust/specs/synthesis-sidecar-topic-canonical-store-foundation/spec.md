## ADDED Requirements

### Requirement: Rust canonical promotion SHALL preserve durable phase semantics

The Rust canonical store SHALL preserve canonical bytes and hashes, create/update CAS, one global writer, exclusive staging, file and directory fsync, atomic rename, journal, backup, receipt, rollback, and forward-recovery semantics.

#### Scenario: Every durable phase is interrupted
- **WHEN** a fresh process restarts after injected failure at `lock_acquired`, `staging_written`, `journal_written`, `current_backed_up`, `current_promoted`, `receipt_written`, or `rollback_restore`
- **THEN** recovery yields the same coherent current snapshot and receipt classification as the Node oracle or fails closed as `repair_required`

### Requirement: Rust canonical validation SHALL reject unsafe trees

The Rust store SHALL reject traversal, symlinks, unknown current files, duplicate filenames, incomplete snapshots, structured-artifact bound violations, and declared hash mismatches before trusting canonical content.

#### Scenario: Unsafe snapshot is inspected
- **WHEN** a current or staging tree contains any prohibited path or content shape
- **THEN** no payload is returned or promoted and the stable invalid diagnostic category matches the oracle

### Requirement: Import and ordinary promotion SHALL share writer admission

Durable bundle import batches and ordinary Topic promotion MUST acquire the same unique writer permit and MUST NOT interleave canonical commit phases.

#### Scenario: Import overlaps promotion
- **WHEN** an import batch holds writer admission and a Topic promotion begins
- **THEN** the promotion returns `canonical_store_busy` without changing current, journal, or receipt state
