## ADDED Requirements

### Requirement: Runtime persistence SHALL own production ordinary asynchronous filesystem selection
Every production TypeScript operation for existence, text or byte reads and writes, copy, move, stat, list, remove, directory creation, append, and temporary-path resolution SHALL delegate adapter selection to `runtimePersistence`. Callers MAY own domain naming, validation, atomicity, retention, and result semantics but MUST NOT select IOUtils, OS.File, Zotero.File, or Node filesystem adapters themselves.

#### Scenario: Cached caller observes a new runtime
- **WHEN** runtime globals change between two calls made through the same cached caller
- **THEN** the second call resolves and uses the currently available filesystem adapter

#### Scenario: Ordinary caller contains a local selector
- **WHEN** the production governance scan finds an ordinary-I/O caller choosing a native or Node adapter
- **THEN** the change fails completion unless that access is a named native-workload exception

### Requirement: Strict and tolerant filesystem semantics SHALL share adapters without sharing failure policy
Strict operations SHALL reject invalid paths, missing required inputs, failed writes, and unavailable adapters. Existing tolerant persistence reads SHALL retain their documented fallback values while using the same late-bound adapter implementation.

#### Scenario: Missing strict input
- **WHEN** a strict workflow read targets a missing file
- **THEN** the call fails with a stable filesystem error rather than returning empty content

#### Scenario: Missing tolerant state file
- **WHEN** a tolerant persistence read targets an absent optional state file
- **THEN** it returns the documented empty state without changing strict behavior

### Requirement: Atomic and Unicode-sensitive operations SHALL have observable guarantees
Atomic replacement, bounded append, move, and removal SHALL either satisfy their declared final-state guarantee or fail without claiming success. Text append SHALL preserve Unicode text across all supported runtime adapters.

#### Scenario: Atomic replacement is unavailable
- **WHEN** the selected adapter cannot provide the required atomic replacement guarantee
- **THEN** the strict operation fails as unavailable and leaves the previously committed target usable

#### Scenario: Unicode log entry is appended
- **WHEN** a caller appends non-ASCII text through runtime persistence
- **THEN** a subsequent indexed or full read returns the same text without encoding loss
