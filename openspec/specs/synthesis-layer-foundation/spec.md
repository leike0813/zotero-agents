# synthesis-layer-foundation Specification

## Purpose
TBD - created by archiving change add-synthesis-layer-foundation. Update Purpose after archive.
## Requirements
### Requirement: Canonical assets use versioned JSON envelopes

Synthesis Layer canonical JSON assets SHALL use a versioned envelope with
`schema_id`, `schema_version`, `created_at`, `updated_at`, and `data`.

#### Scenario: Valid envelope is parsed

- **WHEN** a canonical JSON envelope contains the required fields and matches a
  registered schema
- **THEN** the foundation parser SHALL return the envelope data
- **AND** the parser SHALL expose schema id and version.

#### Scenario: Unknown fields are present in canonical assets

- **WHEN** a canonical asset contains additional top-level fields
- **THEN** the parser SHALL preserve the original envelope
- **AND** it SHALL return a warning rather than silently dropping the fields.

### Requirement: Foundation hashes are SHA-256 over canonical inputs

Synthesis Layer foundation helpers SHALL use SHA-256 hashes formatted as
`sha256:<lowercase-hex>`.

#### Scenario: Equivalent JSON objects are hashed

- **WHEN** two JSON objects differ only by object key order
- **THEN** their canonical JSON hash SHALL be identical.

#### Scenario: Markdown line endings differ

- **WHEN** Markdown differs only by CRLF, CR, or LF line endings
- **THEN** its normalized Markdown hash SHALL be identical.

### Requirement: Note shards encode sync mirror payloads

Synthesis note shards SHALL encode mirror payloads in hidden HTML comments and
SHALL not expose machine JSON as visible note content.

#### Scenario: Shard title is formatted

- **WHEN** a shard title is created for a library id, kind, sequence, and total
- **THEN** it SHALL follow `ZS Synthesis Mirror [<library-id>] <kind> <seq:000>/<total:000>`.

#### Scenario: Payload roundtrip succeeds

- **WHEN** a canonical JSON payload is encoded into a shard and decoded
- **THEN** the decoded payload SHALL equal the original canonical JSON text
- **AND** `payload_hash` and `encoded_hash` SHALL be verified.

#### Scenario: Manifest hash is computed

- **WHEN** a mirror manifest is hashed
- **THEN** shards SHALL be sorted by fixed kind order then sequence
- **AND** `manifest_hash` SHALL be excluded from its own hash input.

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

The foundation change SHALL NOT implement Paper Registry, Unified Citation Graph,
Synthesis MCP tools, ACP Skills synthesis workflow, or Synthesis UI.

#### Scenario: Foundation is reviewed

- **WHEN** this change is reviewed
- **THEN** implementation SHALL be limited to reusable foundation helpers and
  tests for those helpers.

