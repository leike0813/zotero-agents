# synthesis-topic-path-identity Specification

## Purpose

Defines the stable filesystem identity of structured Synthesis Topic snapshots and the bounded compatibility behavior required for profiles written by the historical TypeScript implementation.

## Requirements

### Requirement: Current Topic path identity is cross-language stable

The canonical Topic path ID SHALL preserve the existing lowercase ASCII slug algorithm, including its 80-character bound. When a Topic ID produces no slug, the path ID SHALL be the first 16 lowercase hexadecimal characters of the SHA-256 hash of canonical JSON `{"topic_id": <topicId>}` after removing the `sha256:` prefix. TypeScript and Rust SHALL produce the same result.

#### Scenario: Sluggable Topic ID

- **WHEN** a Topic ID contains ASCII letters, digits, `.`, `_`, or `-` after normalization
- **THEN** the canonical path ID SHALL be the normalized slug

#### Scenario: Non-sluggable Topic ID

- **WHEN** a Topic ID produces an empty ASCII slug
- **THEN** the canonical path ID SHALL contain exactly 16 hexadecimal characters

### Requirement: Historical TypeScript Topic directories remain readable

The canonical store SHALL read a valid historical snapshot from the exact 9-character hash path produced by the historical TypeScript fallback when the current 16-character directory is absent. The returned public snapshot and projection SHALL use the current 16-character path ID.

#### Scenario: Legacy directory is the only current snapshot

- **WHEN** the current 16-character directory is absent and the historical 9-character directory contains a valid snapshot for the requested Topic
- **THEN** inspect, read, capture, legacy preflight, and archive SHALL operate on that snapshot
- **AND** the returned path ID SHALL be the current 16-character value

#### Scenario: Current directory exists

- **WHEN** the current 16-character directory exists
- **THEN** it SHALL be authoritative
- **AND** an invalid current directory SHALL fail closed without falling back to the historical directory

#### Scenario: Legacy candidate has the wrong Topic identity

- **WHEN** the historical candidate exists but its manifest or metadata identifies another Topic
- **THEN** the operation SHALL fail with the existing canonical identity/mismatch error path

### Requirement: New Topic writes use only the current identity

Canonical Topic creation and update promotion SHALL write under the current 16-character path ID. Historical directories SHALL not be deleted, renamed, or overwritten automatically during startup or compatibility reads.

#### Scenario: New non-ASCII Topic is promoted

- **WHEN** a valid non-sluggable Topic is created or updated
- **THEN** its current snapshot SHALL be written under the 16-character canonical directory
- **AND** subsequent reads SHALL prefer that directory

#### Scenario: Historical bytes are inspected during startup

- **WHEN** legacy preflight reads a valid historical snapshot
- **THEN** it SHALL not rewrite or delete the historical snapshot bytes before migration publication