## ADDED Requirements

### Requirement: Strict portable knowledge checkpoint contract

The system SHALL define a versioned, bounded `SynthesisKnowledgeCheckpoint` containing the active Tag Vocabulary rows, all six Concept KB row families, all three Topic Graph row families, the captured Tag revision, Concept manifest, and Topic Graph manifest, normalized counts, a deterministic checkpoint hash, and generation time. Strict rebuilding SHALL reject unknown fields, duplicate stable identifiers, dangling references, invalid domain rows, invalid bases or counts, and collection-limit violations. Runtime-only or rebuildable state including indexes, staged Tag suggestions, Tag audits, pending effects, and canonical Topic assets SHALL be excluded.

#### Scenario: Deterministic capture
- **WHEN** unchanged knowledge state is captured more than once with different generation times or source row ordering
- **THEN** the normalized rows, bases, counts, and checkpoint hash are identical while generation time may differ

#### Scenario: Strict invalid input rejection
- **WHEN** a checkpoint contains an unknown field, duplicate identifier, dangling reference, inconsistent count or hash, or collection above a declared limit
- **THEN** verification rejects the complete checkpoint without creating a preview receipt or mutating repository state

### Requirement: Atomic cross-domain checkpoint capture

`buildCheckpoint` SHALL capture the three active domain bases and all included row families from one repository transaction, normalize them through the existing domain snapshot rebuilders, calculate counts, and hash only the format/version, bases, and normalized payload.

#### Scenario: Concurrent domain mutation during capture
- **WHEN** a domain mutation attempts to interleave with checkpoint capture
- **THEN** the produced checkpoint represents one transactionally consistent state rather than a mix of old and new domain bases

### Requirement: Single-receipt full-replacement preview

`previewImport` SHALL verify the checkpoint, atomically capture current knowledge state, compute per-domain and per-family add/update/delete counts, enumerate every existing user decision that the replacement would overwrite, and return a receipt bound to the checkpoint hash and all three captured bases. The application SHALL retain at most one in-process receipt, and a later preview SHALL invalidate the earlier receipt.

#### Scenario: Preview reports replacement impact
- **WHEN** a verified checkpoint adds, updates, and deletes rows and changes confirmed or rejected user decisions
- **THEN** preview reports the normalized per-family differences and every decision override without changing any repository row

#### Scenario: New preview supersedes old receipt
- **WHEN** a second checkpoint is previewed before the first receipt is applied
- **THEN** only the second receipt remains eligible for apply

### Requirement: Explicit single-use atomic import application

`applyImport` SHALL require the active receipt ID, the exact checkpoint hash, and explicit full-replacement acknowledgement. It SHALL consume the receipt before every apply attempt and SHALL replace all three included domains in one repository transaction only when the captured Tag revision, Concept manifest, and Topic Graph manifest remain active. A missing acknowledgement, receipt/hash mismatch, superseded basis, validation failure, or row-write failure SHALL commit no domain changes.

#### Scenario: Successful acknowledged replacement
- **WHEN** apply receives the active receipt ID, matching checkpoint hash, explicit full-replacement acknowledgement, and all captured bases remain active
- **THEN** all three domains are replaced and committed together and the receipt cannot be used again

#### Scenario: Apply failure rolls back every domain
- **WHEN** any domain basis is superseded or any validation, constraint, or row-write step fails
- **THEN** the complete transaction rolls back and the consumed receipt cannot be retried

#### Scenario: Missing replacement acknowledgement
- **WHEN** apply omits explicit full-replacement acknowledgement
- **THEN** no repository mutation occurs and the submitted receipt is invalidated

### Requirement: Operational state preservation and index invalidation

A successful import SHALL leave Tag staged suggestions, audit rows, and pending Host effects unchanged. It SHALL preserve the last-good Tag Vocabulary, Concept KB, and Topic Graph index payloads and hashes byte-for-byte while marking all three index states stale against the new active bases.

#### Scenario: Import after local operational work
- **WHEN** a checkpoint is applied while staged suggestions, audit history, pending effects, and last-good indexes exist
- **THEN** the local operational rows and index payloads remain intact and every imported domain index is marked stale

### Requirement: Private admission and lifecycle boundary

The knowledge checkpoint coordinator SHALL expose only private application methods for build, verify, preview, apply, discard, admission stop, and shutdown. Restart, discard, admission stop, or shutdown SHALL clear any receipt. Admission stop SHALL reject new work and shutdown SHALL await active checkpoint work before the domain applications, worker pool, or repository are closed.

#### Scenario: Stop during active checkpoint work
- **WHEN** service shutdown begins while a checkpoint operation is active
- **THEN** new operations are rejected, the receipt is cleared, active work drains, and repository close occurs only afterward

#### Scenario: Process restart
- **WHEN** the service restarts after issuing a preview receipt
- **THEN** the previous process receipt is unavailable and apply requires a new preview

### Requirement: Production compatibility and public isolation

Production checkpoint export and JSON import SHALL reuse shared normalization, hash, or diff facts only where their semantics are identical. Existing canonical per-asset files, legacy projection fallback, public DTOs, apply order, persistence paths, and WebDAV behavior SHALL remain unchanged. The service SHALL add no public capability, HTTP/RPC operation, `SynthesisClient` route, Workbench command, Host Bridge route, MCP tool, or automatic invocation for the private coordinator.

#### Scenario: Existing production import and export
- **WHEN** existing production checkpoint export and JSON import compatibility suites run after the shared helpers are introduced
- **THEN** their externally observable payloads, fallback behavior, apply order, and routes remain unchanged

#### Scenario: Service capability discovery
- **WHEN** the service handshake, capability inventory, Host Bridge, or client method inventory is inspected
- **THEN** no knowledge-checkpoint operation is publicly discoverable and the existing production method/consumer invariants remain unchanged
