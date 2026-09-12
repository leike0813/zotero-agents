## MODIFIED Requirements

### Requirement: Current Topic path identity is cross-language stable

The canonical Topic path ID SHALL use the normalized lowercase ASCII slug algorithm as a human-readable prefix of at most 15 characters followed by `-` and the complete 64-character lowercase hexadecimal SHA-256 of canonical JSON `{"topic_id": <topicId>}`. When normalization produces no slug, the path ID SHALL be the complete 64-character hash. TypeScript and Rust SHALL produce the same result, and every path ID SHALL remain within 80 characters.

#### Scenario: Sluggable Topic ID

- **WHEN** a Topic ID contains ASCII letters, digits, `.`, `_`, or `-` after normalization
- **THEN** the canonical path ID SHALL contain the bounded slug prefix and complete identity hash
- **AND** two Topic IDs sharing the same first 80 normalized characters SHALL still produce different path IDs.

#### Scenario: Non-sluggable Topic ID

- **WHEN** a Topic ID produces an empty ASCII slug
- **THEN** the canonical path ID SHALL contain exactly 64 hexadecimal characters.

### Requirement: Historical TypeScript Topic directories remain readable

At startup, the canonical store SHALL discover supported historical Topic directories produced by the previous slug, 16-character hash, or 9-character hash formulas. It SHALL validate the recorded Topic identity and basis, migrate each active current snapshot to the new path identity through the canonical staged promotion path, and preserve the historical bytes until the new snapshot is verified. Runtime reads after successful startup SHALL use only the new identity.

#### Scenario: Legacy directory is the only current snapshot

- **WHEN** a supported historical directory contains a valid current snapshot for its recorded Topic
- **THEN** startup SHALL promote and verify that snapshot under the new path ID
- **AND** subsequent inspect, read, capture, preflight, and archive operations SHALL use the new path.

#### Scenario: Current directory exists

- **WHEN** both a supported historical directory and the new directory exist
- **THEN** startup SHALL require them to identify the same Topic and basis
- **AND** any mismatch SHALL fail closed without deleting either copy.

#### Scenario: Legacy candidate has the wrong Topic identity

- **WHEN** a historical candidate's manifest or metadata does not match the identity implied by its supported old path
- **THEN** startup SHALL fail through the canonical identity or mismatch error path
- **AND** it SHALL preserve the candidate bytes.

### Requirement: New Topic writes use only the current identity

Canonical Topic creation and update promotion SHALL write only under the new slug-plus-full-hash path identity. Historical path formulas SHALL be accepted only by startup migration and SHALL not remain a live read fallback.

#### Scenario: New non-ASCII Topic is promoted

- **WHEN** any valid Topic is created or updated
- **THEN** its current snapshot SHALL be written under the new canonical directory
- **AND** subsequent reads SHALL use that directory.

#### Scenario: Historical bytes are inspected during startup

- **WHEN** startup migrates a valid historical snapshot
- **THEN** it SHALL retain the old snapshot until the new snapshot is durably promoted and verified
- **AND** retrying an interrupted migration SHALL be idempotent.
