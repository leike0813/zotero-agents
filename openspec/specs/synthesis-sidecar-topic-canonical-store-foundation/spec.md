# synthesis-sidecar-topic-canonical-store-foundation Specification

## Purpose

Define durable Rust canonical promotion phases and platform-safe synchronization behavior for Topic state.

## Requirements

### Requirement: Rust canonical promotion SHALL preserve durable phase semantics

The Rust canonical store SHALL preserve canonical bytes and hashes, create/update
CAS, one global writer, exclusive staging, file fsync, atomic rename, journal,
backup, receipt, rollback, and forward-recovery semantics. Unix builds SHALL
fsync directories at durable rename boundaries. Windows builds SHALL retain
per-file `sync_all` and use an explicit directory-sync no-op because directory
handles opened for this store cannot be flushed with `FlushFileBuffers`; the
journal and recovery protocol remain mandatory.

#### Scenario: Windows directory synchronization does not block a transaction
- **WHEN** a Windows canonical-store promotion performs writes, renames, and a
  restart recovery
- **THEN** directory synchronization SHALL not fail the transaction, and the
  recovered current snapshot and receipt classification SHALL remain coherent
