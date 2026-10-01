# Built-in Pi Owner Persistence

## Purpose

Persist Pi Conversation and Pi Skill Run histories in project-owned canonical transcripts and rebuildable projections.

## Requirements

### Requirement: A Pi owner has one canonical transcript

The store SHALL create distinct Pi Conversation and Pi Skill Run owners with opaque IDs and a versioned per-owner JSONL header. It SHALL persist committed entries with monotonic owner-local sequence, stable identity, turn and parent linkage, timestamp, kind, and strict-JSON payload. No native SDK state or credentials SHALL be stored.

#### Scenario: Owners write independent histories

- **WHEN** Conversation and Skill Run owners append entries
- **THEN** each history keeps its own identity and sequence without duplicating payload in SQLite

### Requirement: Canonical append precedes projections

The store SHALL append JSONL before updating a rebuildable index and the single `pi_owner_registry` SQLite table. Projection failure SHALL preserve and report the committed log, and a retry of the same entry SHALL not duplicate it.

#### Scenario: Projection update fails

- **WHEN** index or SQLite update fails after a committed append
- **THEN** the caller learns that the canonical entry committed and explicit rebuild restores projections

### Requirement: Transcript inspection protects committed facts

The store SHALL distinguish a final uncommitted torn line from corruption in committed history. It SHALL refuse writes to corrupt history. A torn tail SHALL be repaired only after rechecking the source, either on explicit request or during lifecycle recovery; committed entries SHALL remain intact.

#### Scenario: Tail is incomplete

- **WHEN** a log ends in a partial JSONL line after valid committed entries
- **THEN** inspection reports the last valid byte offset and explicit or lifecycle repair preserves valid entries with a repair fact

#### Scenario: Committed history is corrupt

- **WHEN** a middle line is invalid or a parent entry is missing
- **THEN** inspection reports recovery required without truncating the log

### Requirement: Indexed pages and registry are rebuildable

The store SHALL read bounded pages by byte offset and SHALL rebuild its index and owner registry from canonical logs. Runtime memory, full mirrors, and SQLite SHALL NOT become transcript authority.

#### Scenario: Derived files are missing

- **WHEN** the index or registry is lost while the JSONL remains valid
- **THEN** rebuilt projections return the same owner identity and ordered entries

#### Scenario: Zotero host reads a page

- **WHEN** a supported Zotero host reads a Pi transcript page
- **THEN** the page matches Node behavior using the runtime filesystem adapter without a Node runtime

### Requirement: Recovery inventory and checkpoints preserve canonical authority

Owner inventory SHALL include canonical directories and registry identities, expose reliable accounting failure and support bounded serial inspection. Lifecycle SHALL automatically invoke safe torn-tail repair and rebuild lagging projections while preserving committed corruption. Versioned budget/checkpoint, invocation binding and deletion facts SHALL remain canonical; SQLite SHALL contain only rebuildable scalars or minimal deletion receipts.

#### Scenario: Registry misses a committed owner

- **WHEN** a valid owner directory exists without its registry projection
- **THEN** startup discovers and reconstructs it without losing admitted execution facts

#### Scenario: Budget evidence is missing

- **WHEN** an already-dispatched owner has no trustworthy active-budget checkpoint
- **THEN** automatic continuation is refused and its canonical history is preserved
