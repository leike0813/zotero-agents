# synthesis-topic-path-identity Specification

## Purpose

Defines the stable filesystem identity of structured Synthesis Topic snapshots and the bounded compatibility behavior required for profiles written by the historical TypeScript implementation.

## Requirements

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

At startup, the canonical store SHALL discover supported historical Topic directories produced by the previous slug, 16-character hash, or 9-character hash formulas. It SHALL validate the recorded Topic identity and basis. A new-path current snapshot that passes Topic identity, path, and content integrity validation SHALL be the sole runtime authority for its Topic; retained historical snapshots may have a different manifest or artifact basis. Only when the new-path current snapshot is absent SHALL startup migrate each active historical current snapshot to the new path identity through the canonical staged promotion path, and preserve the historical bytes until the new snapshot is verified. A new-path current snapshot that fails validation SHALL fail startup without falling back to or overwriting a historical snapshot. Runtime reads after successful startup SHALL use only the new identity.

#### Scenario: Legacy directory is the only current snapshot

- **WHEN** a supported historical directory contains a valid current snapshot for its recorded Topic
- **THEN** startup SHALL promote and verify that snapshot under the new path ID
- **AND** subsequent inspect, read, capture, preflight, and archive operations SHALL use the new path.

#### Scenario: Current directory exists

- **WHEN** both a supported historical directory and the new directory for the same recorded Topic exist
- **AND** the new directory contains a current snapshot that passes Topic identity, canonical path, and content integrity validation
- **THEN** startup SHALL use that current snapshot as the sole runtime authority for the Topic
- **AND** it SHALL retain the historical bytes as recovery evidence without requiring their manifest or artifact basis to match.

#### Scenario: Migrated Topic is updated and reopened

- **WHEN** startup migrates and verifies a supported historical current snapshot under the new path
- **AND** a subsequent update promotes an updated current snapshot
- **AND** the canonical store reopens with both snapshots present
- **THEN** startup SHALL use the validated current snapshot as the sole runtime authority even when its manifest or artifact basis differs from the retained historical snapshot
- **AND** it SHALL retain the historical bytes as recovery evidence.

#### Scenario: Current directory is invalid

- **WHEN** a new-path current snapshot fails Topic identity, path identity, or content integrity validation
- **THEN** startup SHALL fail closed
- **AND** it SHALL preserve existing bytes without falling back to historical data or overwriting the current snapshot.

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
