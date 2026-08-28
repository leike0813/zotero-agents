## ADDED Requirements

### Requirement: Production reads SHALL be bounded at the data source

Pagination and filtering SHALL be applied by repository or Host queries before materialization. Returning one page MUST NOT require an unbounded table/library read, a per-row projection query, or a response-only slice of a full in-memory result.

#### Scenario: Topic page is read
- **WHEN** production lists one Topic page
- **THEN** repository query count remains constant for the page
- **AND** detail, resolver, resolved-set, and projection payloads are not loaded for every row

#### Scenario: Graph page is read
- **WHEN** production reads a Graph slice, metrics page, layout, or topic scope
- **THEN** query count and DTO bytes are bounded by the requested window
- **AND** they do not grow with unrelated total Topic or graph state

### Requirement: Reference refresh SHALL scale with changed sources

One Reference refresh operation SHALL capture Host item/artifact identity no more than once, determine changed sources, and process source-keyed batches without reloading complete current source, artifact, raw-reference, or binding state per batch.

#### Scenario: Large library has a small changed set
- **WHEN** a library snapshot contains many sources and only a bounded subset changed
- **THEN** payload reads and projection work scale with the changed subset
- **AND** the final sweep uses bounded source identity rather than full content

### Requirement: Production scale gates SHALL cover the real native route

The governed benchmark SHALL exercise TypeScript native composition, HTTP, Rust dispatch, SQLite, workers, and reverse Host. At 10k papers, chrome SHALL complete within 1 second, Index within 2.5 seconds, exact filter/Graph slice/metrics within 1.5 seconds, and a 50-paper Reference refresh within 2.5 seconds. At 25k papers, a UI read SHALL return a bounded result or explicit degraded state within 2.5 seconds without full-library DTO materialization.

#### Scenario: Ten-thousand-paper benchmark runs
- **WHEN** the fixed fixture is exercised through the real production route
- **THEN** latency budgets pass and incremental UI-read RSS remains below 128 MiB
- **AND** request/response bytes, SQL query count, Host call count, and p50/p95 are recorded

#### Scenario: Stress fixture runs
- **WHEN** the 25k fixture exceeds a complete-view budget
- **THEN** the operation returns bounded degraded evidence
- **AND** it does not hang, exhaust memory, or silently truncate without metadata

### Requirement: Repository concurrency SHALL isolate reads from long work

The native repository SHALL serialize writes through one owner and permit at most four bounded read-only connections. Host/file/worker work MUST occur outside write transactions, and an active long operation MUST NOT hold the repository owner while waiting on external or compute work.

#### Scenario: Read arrives during long work
- **WHEN** a long operation is computing or transferring content
- **THEN** bounded chrome and status reads can use a read connection
- **AND** promotion still validates its basis through the single writer
