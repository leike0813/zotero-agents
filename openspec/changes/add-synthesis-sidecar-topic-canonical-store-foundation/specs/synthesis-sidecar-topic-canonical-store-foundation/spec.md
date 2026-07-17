## ADDED Requirements

### Requirement: Topic canonical semantics have one environment-neutral owner
The application package SHALL strictly rebuild complete Topic current snapshots and own canonical JSON text, SHA-256 hashes, Topic path identity, section filenames, inspect projection, and the canonical store port without importing Node, Zotero, Host, or UI authority.

#### Scenario: Plugin and sidecar canonical rules agree
- **WHEN** the same manifest, artifact, metadata envelope, and sections are projected through plugin compatibility exports and the application package
- **THEN** every hash, filename, byte length, and canonical text value is identical

### Requirement: Shadow canonical identity and paths are fixed
The Node adapter SHALL persist only beneath `<profileRuntimeRoot>/shadow-canonical/<dataRootId>/`, bind profile, data-root, schema, and opaque store identity in a strict marker, derive every Topic path, and reject traversal, symlinks, unknown current files, duplicate filenames, incomplete snapshots, hash mismatch, and structured-artifact bound violations.

#### Scenario: Unsafe current content is never trusted
- **WHEN** inspect encounters a symlink, unknown file, missing file, duplicate descriptor, or mismatched declared hash for the requested Topic
- **THEN** it returns `invalid` with stable diagnostics and no canonical payload

### Requirement: Promotion is complete, compare-and-swap, and recoverable
Promotion SHALL require `null` basis for create or matching current manifest/artifact hashes for update, perform zero writes on mismatch, allow one global writer, fsync a complete staging tree before a journaled rename, persist a receipt, and restore old current after every uncommitted failure.

#### Scenario: Concurrent or stale promotion does not mutate current
- **WHEN** a promotion overlaps the global writer or supplies a stale expected basis
- **THEN** it returns `canonical_store_busy` or `basis_mismatch` respectively and leaves current byte-for-byte unchanged

#### Scenario: Interrupted promotion recovers on restart
- **WHEN** the service restarts with a valid incomplete transaction journal
- **THEN** initialization restores the prior current or removes an interrupted create without scanning unrelated Topics

### Requirement: Unrecoverable stores fail closed
If an in-process rollback cannot restore coherence, the store SHALL enter `repair_required`, refuse later writes, and expose that constant-time state. Malformed identity or journal structures SHALL fail startup.

#### Scenario: Repair state preserves read-only observability
- **WHEN** rollback cannot restore the old current
- **THEN** health and handshake remain bounded, report `repair_required`, and every later promotion returns `repair_required`

### Requirement: Authenticated inspect is bounded and worker-independent
The service SHALL advertise authenticated general capability `topics.canonical.inspect`, strictly accept `{ topicId }`, and return only `absent|ready|invalid`, Topic/path identity, canonical hashes, sorted section descriptors, and stable diagnostics under the general 1 MiB/50k-node limits.

#### Scenario: Inspect does not consume worker capacity
- **WHEN** inspect runs while the compute pool is busy or degraded
- **THEN** it reads the main-process canonical owner, returns normally, and does not enqueue or execute worker work

### Requirement: Production authority remains unchanged
The store SHALL never read or modify production canonical files or the production database and SHALL expose no apply, promote, archive, Host effect, WebDAV, or fallback capability.

#### Scenario: Foundation canary remains shadow-only
- **WHEN** the service persists and inspects a Topic across restart
- **THEN** the 108 public methods, one direct consumer, eight engine owners, two production worker routes, and `mutationEnabled: false` remain unchanged
