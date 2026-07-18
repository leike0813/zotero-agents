## ADDED Requirements

### Requirement: Private sidecar owns an isolated Tag Vocabulary aggregate
The Synthesis sidecar SHALL persist an isolated Tag Vocabulary aggregate containing vocabulary entries, aliases, abbreviations, protocol, validation warnings, staged suggestions, audit facts, application state, index state, and Host-effect facts without reading or mutating production storage.

#### Scenario: Service restarts after Tag mutations
- **WHEN** the isolated service restarts after committed vocabulary, staged, audit, index, or effect changes
- **THEN** the private Tag application SHALL reconstruct the same current state from its isolated SQLite repository
- **AND** production database and canonical files SHALL remain untouched.

### Requirement: Private Tag contracts are strict and bounded
The private Tag application SHALL accept and return versioned JSON-safe DTOs with bounded collections, deterministic ordering, stable structured codes, and strict field rebuilding.

#### Scenario: Malformed or oversized request arrives
- **WHEN** a private Tag request contains unknown fields, invalid identities, duplicate keys, or collections beyond the configured engine or application limits
- **THEN** the request SHALL fail before repository mutation or engine execution.

### Requirement: Vocabulary mutations preserve last-good state
Vocabulary replacement, entry update, and entry deletion SHALL validate a detached candidate and promote it only when the captured vocabulary basis remains current.

#### Scenario: Validation or basis check fails
- **WHEN** validation throws, is canceled, returns malformed output, reports an error, or the vocabulary basis changes before promotion
- **THEN** vocabulary rows, warnings, application state, and last-good index state SHALL remain unchanged.

#### Scenario: Entry is renamed or deleted
- **WHEN** a valid entry rename or deletion commits
- **THEN** aliases and replacement references SHALL be updated or removed atomically
- **AND** unrelated metadata SHALL be preserved.

### Requirement: Staged suggestions form a revisioned inbox
The private Tag application SHALL support bounded listing, deterministic staging merges, atomic update/rename collision handling, discard, and clear using a staged revision.

#### Scenario: Staged rename write fails
- **WHEN** any row operation fails during a staged suggestion rename or collision merge
- **THEN** every original staged row and the staged revision SHALL remain unchanged.

### Requirement: Promotion commits durable effects before Host dispatch
Promoting staged suggestions SHALL atomically validate and commit new vocabulary entries, remove only promoted staged rows, mark the index stale, and persist deterministic pending Host Tag effects before any Host call.

#### Scenario: Host is unavailable after promotion commit
- **WHEN** the Host port is missing, throws, or returns malformed receipts after a promotion commits
- **THEN** the vocabulary commit SHALL remain authoritative
- **AND** pending effects and bounded stable diagnostics SHALL remain durable.

#### Scenario: Host reports applied or already satisfied
- **WHEN** strict receipts report `applied` or `already_satisfied`
- **THEN** the corresponding effects SHALL be recorded as satisfied with their stable parent references.

#### Scenario: Legacy binding resolution fails
- **WHEN** a staged row contains legacy numeric bindings and the bounded migration port cannot resolve them
- **THEN** promotion SHALL leave vocabulary, staged rows, revisions, and effects unchanged.

### Requirement: Tag index promotion is basis guarded
The private application SHALL construct the Tag index through the bounded sidecar worker and promote it only while its source vocabulary hash remains active.

#### Scenario: Index result is superseded or invalid
- **WHEN** index computation fails, returns malformed output, or its source vocabulary is superseded
- **THEN** the last-good index and its active basis SHALL remain unchanged.

### Requirement: Audit and regulator use cases remain domain bounded
The private application SHALL provide deterministic active-tag export for tag-regulator and atomic per-library Tag audit replacement and clearing without triggering index rebuild, Host effects, files, import, or autosync.

#### Scenario: Audit record is cleared
- **WHEN** a caller clears one valid library/item audit record
- **THEN** the durable record SHALL be marked compliant with an empty non-compliant-tag list.

### Requirement: Private Tag lifecycle drains before persistence closes
The private Tag application SHALL reject new mutations after admission stops and SHALL cancel or drain active computation and effect dispatch before its repository and worker dependencies close.

#### Scenario: Service shutdown begins during Tag work
- **WHEN** shutdown begins while a Tag mutation or compute request is active
- **THEN** no new Tag mutation SHALL be admitted
- **AND** repository closure SHALL occur only after the application reaches a terminal drained state.

### Requirement: Tag foundation remains production disconnected
The private Tag foundation SHALL NOT add a public sidecar capability, authenticated route, `SynthesisClient` method, automatic invocation, Zotero adapter, production persistence owner, checkpoint/import behavior, or WebDAV synchronization.

#### Scenario: Foundation is packaged
- **WHEN** the service bundle and plugin package include the Tag foundation
- **THEN** the public capability and service method inventories SHALL remain unchanged
- **AND** the default composition SHALL have no path to production Tag state or Host mutation.
