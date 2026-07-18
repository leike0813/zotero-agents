## ADDED Requirements

### Requirement: Strict live-kind import normalization
The system SHALL strictly rebuild the payload and verify the payload identity of every live durable entity kind before producing an import candidate, using one registry for validators, stable keys, and aggregate mutation granularity.

#### Scenario: A verified envelope contains malformed domain data
- **WHEN** the outer bundle is valid but an entry payload is malformed or disagrees with its entity identity
- **THEN** preview SHALL return a structured validation diagnostic, no mutation candidate, and no receipt

#### Scenario: All live facts are valid
- **WHEN** a verified v1 or v2 source contains valid facts from every live durable kind
- **THEN** preview SHALL produce a deterministically sorted normalized candidate without coercing or dropping facts

### Requirement: Preview pins a single-use receipt
The private application SHALL compare a verified source with one transactionally captured repository, canonical, and sync-index basis and retain at most one bounded process-local receipt containing the normalized candidate and captured bases.

#### Scenario: Apply follows a clean preview
- **WHEN** apply presents the matching receipt ID, manifest hash, and required overwrite acknowledgement while all captured bases remain current
- **THEN** apply SHALL consume the pinned candidate without rereading the source

#### Scenario: Receipt or basis is stale
- **WHEN** the receipt was replaced, discarded, reused, mismatched, or any captured repository, canonical, or index basis changed
- **THEN** apply SHALL fail before mutation with a stable receipt or `basis_superseded` diagnostic

### Requirement: Deterministic import diff and conflicts
Preview SHALL classify each target entity from normalized base, local, and remote hashes as addition, update, unbased update, unchanged, conflict, or tombstone using one shared conflict projection.

#### Scenario: Both local and remote changed
- **WHEN** a last-synced hash exists and both local and remote hashes differ from it and each other
- **THEN** preview SHALL report a blocking `both_changed` conflict and SHALL NOT issue an apply receipt

#### Scenario: An update has no synced base
- **WHEN** a local fact differs from a remote fact and no last-synced hash exists
- **THEN** preview SHALL report an unbased update and apply SHALL require an explicit overwrite acknowledgement

### Requirement: Tombstones remain apply-blocked
The reader SHALL continue to verify valid tombstone envelopes, but preview SHALL report them as apply-blocking until a later contract defines target identity and delete semantics.

#### Scenario: Source contains a tombstone
- **WHEN** a verified source contains one or more tombstones
- **THEN** preview SHALL count them, return `tombstone_apply_unsupported`, issue no receipt, and perform no deletion

### Requirement: Strict durable sync metadata
The system SHALL define an exact-field, bounded sync-index contract keyed by live durable entity identity with a stable revision and last synced/imported hashes, and SHALL reject invalid keys, paths, hashes, duplicates, unknown fields, or collection overflow.

#### Scenario: Successful import advances metadata
- **WHEN** a clean import commits
- **THEN** the imported live entities and manifest SHALL advance in the same SQLite transaction as their durable facts while absent local entities remain unchanged

#### Scenario: Sync metadata is malformed or superseded
- **WHEN** preview reads malformed metadata or apply observes a different index revision
- **THEN** the operation SHALL fail without advancing facts or metadata

### Requirement: Complete isolated durable repository ownership
The isolated repository SHALL store, capture, and import Topic interest metadata, Topic discovery hints, and Related Items sync effects in their domain table families and SHALL apply the complete live corpus under one expected aggregate-basis transaction.

#### Scenario: Complete corpus imports into an empty owner
- **WHEN** a valid source contains all live kinds and the isolated owner is empty
- **THEN** every fact SHALL be stored and included in the next durable export without invoking Host effects or discovery cascades

#### Scenario: Source omits a local entity
- **WHEN** an otherwise valid incremental source does not contain a local entity and contains no supported deletion operation
- **THEN** apply SHALL preserve that local entity

### Requirement: Recoverable cross-storage commit
The importer SHALL stage and fsync every target Topic current before committing SQLite, SHALL use the repository import receipt as the cross-storage commit marker, and SHALL finish or discard the staged batch deterministically before service readiness.

#### Scenario: Repository CAS fails after staging
- **WHEN** repository or sync-index bases change before the import transaction commits
- **THEN** apply SHALL discard staging and leave SQLite, current Topic content, and sync metadata unchanged

#### Scenario: Process stops after SQLite commit
- **WHEN** the repository receipt is durable but one or more Topic currents are not yet promoted
- **THEN** restart recovery SHALL complete the exact staged targets idempotently before readiness

#### Scenario: Recovery identity is inconsistent
- **WHEN** a journal, staging identity, repository receipt, or current target basis cannot be reconciled
- **THEN** the canonical owner SHALL enter `repair_required` and reject later mutation admission

### Requirement: Canonical current includes bounded Markdown
The private canonical snapshot SHALL losslessly preserve safe bounded `.md` current assets in its full-current basis, CAS, journal, read, export, and import behavior while retaining the existing public inspect DTO.

#### Scenario: Production snapshot contains Markdown
- **WHEN** a verified bundle contains safe Topic current JSON and Markdown files that form a complete Topic snapshot
- **THEN** import and the next export SHALL preserve the Markdown path and bytes exactly

#### Scenario: Current path is not allowed
- **WHEN** a current entry is traversal, a symlink, HTML, `.metadata.json`, below `assets/`, an unknown JSON file, or duplicates another path
- **THEN** preview or staging SHALL fail before mutation with a stable canonical diagnostic

### Requirement: Private lifecycle and production compatibility
Import SHALL share the private durable application's single active lease, receipt cleanup, stop admission, and shutdown drain, expose no new public capability, and preserve production valid import, sync-index, WebDAV, progress, and Host behavior.

#### Scenario: Shutdown overlaps preview or apply
- **WHEN** shutdown starts while a durable operation is active
- **THEN** new admission SHALL fail, the receipt SHALL be discarded, and shutdown SHALL wait for the active operation before dependencies close

#### Scenario: Production compatibility suites run
- **WHEN** established durable import, legacy v1, sync-index, WebDAV, retry/conflict, and Host fixtures execute
- **THEN** their valid public DTOs, canonical bytes, ordering, progress, and capability counts SHALL remain unchanged
