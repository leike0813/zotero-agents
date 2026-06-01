# synthesis-layer-foundation Specification

## Purpose
TBD - created by archiving change add-synthesis-layer-foundation. Update Purpose after archive.
## Requirements
### Requirement: Canonical assets use versioned JSON envelopes

Synthesis Layer canonical JSON assets SHALL use a versioned envelope with
`schema_id`, `schema_version`, `created_at`, `updated_at`, and `data`, and the
default plugin service SHALL store those assets under durable
`data/synthesis`.

#### Scenario: Default Synthesis canonical root is durable

- **WHEN** the default Synthesis service writes canonical assets
- **THEN** the assets SHALL be stored below `<DataDirectory>/zotero-agents/data/synthesis`
- **AND** they SHALL NOT be stored below cleanable runtime directories.

### Requirement: Foundation hashes are SHA-256 over canonical inputs

Synthesis Layer foundation helpers SHALL use SHA-256 hashes formatted as
`sha256:<lowercase-hex>`.

#### Scenario: Equivalent JSON objects are hashed

- **WHEN** two JSON objects differ only by object key order
- **THEN** their canonical JSON hash SHALL be identical.

#### Scenario: Markdown line endings differ

- **WHEN** Markdown differs only by CRLF, CR, or LF line endings
- **THEN** its normalized Markdown hash SHALL be identical.

### Requirement: Foundation writes are concurrency guarded

Synthesis Layer foundation writes SHALL use local library-level serialization
and optimistic base-hash checks.

#### Scenario: Concurrent writes target the same library

- **WHEN** two write operations are scheduled for the same library id
- **THEN** the local write lock SHALL run them one at a time in scheduling order.

#### Scenario: Base hashes match

- **WHEN** current hashes match result bundle base hashes
- **THEN** the compare-and-swap helper SHALL allow the write.

#### Scenario: Base hashes mismatch

- **WHEN** any current hash differs from the corresponding base hash
- **THEN** the compare-and-swap helper SHALL reject overwrite
- **AND** it SHALL report the mismatched hash names so callers can save a local
  conflict candidate without refreshing the mirror.

### Requirement: Foundation scope excludes later Synthesis Layer phases

The foundation change SHALL NOT implement Reference Sidecar Index, Unified Citation Graph,
Synthesis MCP tools, ACP Skills synthesis workflow, or Synthesis UI.

#### Scenario: Foundation is reviewed

- **WHEN** this change is reviewed
- **THEN** implementation SHALL be limited to reusable foundation helpers and
  tests for those helpers.

### Requirement: Knowledge Graph canonical store layout is initialized

Synthesis Layer foundation SHALL initialize a minimal Knowledge Graph canonical
store under `synthesis/` with domain directories for topics, concepts,
topic-graph, citation-graph, tags, sync, and local state.

#### Scenario: Empty store is initialized

- **WHEN** the foundation initializer runs against an empty runtime root
- **THEN** it SHALL create `synthesis/topics`, `synthesis/concepts`,
  `synthesis/topic-graph`, `synthesis/citation-graph`, `synthesis/tags`,
  `synthesis/sync`, and `synthesis/state`
- **AND** it SHALL return the initialized directory paths.

### Requirement: Canonical asset service validates and persists assets

Synthesis Layer foundation SHALL provide internal helpers that read, validate,
and write canonical JSON assets through registered schemas and plugin-safe
runtime persistence APIs.

#### Scenario: Valid asset is written and read

- **WHEN** a canonical JSON asset matches its registered schema and its managed
  relative path satisfies canonical asset policy
- **THEN** the asset service SHALL persist it as a versioned canonical envelope
- **AND** a later read SHALL return the validated envelope data.

#### Scenario: Invalid asset path is rejected before staging

- **WHEN** any canonical transaction asset path violates KG scope, traversal,
  segment, relative path budget, reserved name, or case-collision rules
- **THEN** the foundation SHALL reject the transaction before staging
- **AND** it SHALL NOT write target assets, receipts, store-change events, or
  projection stale marks.

### Requirement: Canonical transactions emit a single store change event

Synthesis Layer foundation SHALL group canonical writes in an internal
transaction that writes receipts and emits one `canonical-store-changed` event
after a successful commit.

#### Scenario: Transaction commits multiple assets

- **WHEN** one transaction writes multiple canonical assets in the same scope
- **THEN** the foundation SHALL persist the assets
- **AND** it SHALL record one receipt for the transaction
- **AND** it SHALL emit exactly one `canonical-store-changed` event containing
  the scope, changed assets, transaction id, and timestamp.

#### Scenario: Transaction fails validation

- **WHEN** any transaction asset fails validation before commit
- **THEN** the foundation SHALL leave existing target assets unchanged
- **AND** it SHALL write sanitized diagnostics for the failed transaction.

### Requirement: Projection registry tracks stale and rebuild state

Synthesis Layer foundation SHALL maintain lightweight projection state for
Knowledge Graph domains without treating SQLite files as canonical sync assets.

#### Scenario: Canonical transaction marks projections stale

- **WHEN** a canonical transaction commits for a domain scope
- **THEN** the matching projection state SHALL be marked stale
- **AND** it SHALL record the transaction id, source manifest hash when
  available, and update timestamp.

#### Scenario: Projection rebuild is recorded

- **WHEN** a projection rebuild completes for a target
- **THEN** the projection registry SHALL record schema version, source manifest
  hash, stale flag, last rebuild time, and diagnostics
- **AND** deleting `state/*.sqlite` SHALL NOT remove the registry state needed to
  know that the projection is rebuildable.

### Requirement: Foundation diagnostics are sanitized

Synthesis Layer foundation SHALL sanitize diagnostics emitted by canonical store
helpers.

#### Scenario: Sensitive diagnostic input is recorded

- **WHEN** diagnostics include tokens, secrets, or absolute runtime paths
- **THEN** persisted diagnostics SHALL omit token and secret values
- **AND** persisted diagnostics SHALL not contain the raw absolute path.

### Requirement: Synthesis foundation manages canonical transactions and derived projection state

Foundation SHALL provide reusable transaction, event, diagnostics, and projection stale helpers for canonical store domains.

#### Scenario: Git adapter exchange runs

- **WHEN** a production Git adapter exchanges canonical assets with a worktree
- **THEN** the local canonical store SHALL remain the source of truth
- **AND** imported remote content SHALL still enter the store only through Foundation-backed Git Sync import validation and promotion.

### Requirement: UI snapshot reads do not write foundation state

Synthesis foundation state SHALL only be mutated by explicit write, rebuild, or
job operations.

#### Scenario: Workbench snapshot is read

- **WHEN** the Workbench reads a Synthesis snapshot
- **THEN** canonical store receipts, events, diagnostics, and projection
  registry state SHALL remain unchanged.

### Requirement: Canonical asset filenames are short and stable

Synthesis domain code SHALL use short stable managed filenames for canonical
assets derived from high-entropy or long semantic identifiers.

#### Scenario: Long source identifier is persisted

- **WHEN** a canonical record is derived from a long title, reference string, or
  raw identifier
- **THEN** the asset filename SHALL use a stable short hash-based name
- **AND** the original semantic identifier SHALL remain inside the canonical
  record data rather than the filename.

### Requirement: Zotero note mirror is not a runtime persistence path

Zotero note mirror SHALL NOT participate in normal Synthesis runtime
persistence.

#### Scenario: Canonical write completes without mirror refresh

- **WHEN** a topic synthesis apply, delete, purge, or canonical transaction
  succeeds
- **THEN** the default service SHALL NOT create or update Zotero anchor notes or
  mirror shards.

#### Scenario: Legacy mirror is migration-only

- **WHEN** legacy mirror content exists
- **THEN** only the explicit one-shot migration script MAY read it as a legacy
  source
- **AND** the plugin runtime SHALL NOT expose mirror rebuild/recovery as the
  primary sync mechanism.
