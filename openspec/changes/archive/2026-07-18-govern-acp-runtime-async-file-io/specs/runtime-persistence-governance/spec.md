## ADDED Requirements

### Requirement: Zotero runtime text I/O SHALL not block through synchronous Components streams

Plugin-owned Zotero runtime text append and indexed range reads SHALL use
asynchronous main-thread boundaries and SHALL NOT fall back to synchronous
Components file streams or whole-file rewrite/slice behavior.

#### Scenario: Runtime text is appended in Zotero
- **WHEN** a transcript, audit, output revision, or semantic trace appends text
- **THEN** the append SHALL use ordered asynchronous true-append operations
- **AND** oversized content SHALL be split without corrupting Unicode or write order.

#### Scenario: Indexed ranges are read in Zotero
- **WHEN** runtime persistence reads one or more UTF-8 byte ranges
- **THEN** file opening and byte reads SHALL execute outside the Zotero main thread
- **AND** outputs SHALL preserve the input range order and UTF-8 byte semantics.

#### Scenario: Async file capability is unavailable
- **WHEN** the required Zotero asynchronous or worker file capability cannot be created
- **THEN** the operation SHALL fail with a structured runtime file I/O error
- **AND** it SHALL NOT silently select a synchronous Components fallback.
