## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Canonical asset filenames are short and stable

Synthesis domain code SHALL use short stable managed filenames for canonical
assets derived from high-entropy or long semantic identifiers.

#### Scenario: Long source identifier is persisted

- **WHEN** a canonical record is derived from a long title, reference string, or
  raw identifier
- **THEN** the asset filename SHALL use a stable short hash-based name
- **AND** the original semantic identifier SHALL remain inside the canonical
  record data rather than the filename.
