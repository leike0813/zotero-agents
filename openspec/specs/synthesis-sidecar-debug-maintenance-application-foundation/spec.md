# synthesis-sidecar-debug-maintenance-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar debug maintenance component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: Debug projections are strict bounded and JSON-safe

The shared contract SHALL expose only fixed status, schema summary, cache page, operation page, isolated snapshot, paper inspect, Topic inspect, snapshot diff, and profiler projections with stable ordering, cursors, truncation, diagnostics, and redaction.

#### Scenario: A projection exceeds its bound
- **WHEN** an ordinary page exceeds 100 entries or a debug page exceeds 1,000 entries
- **THEN** the result SHALL be deterministically truncated with a stable continuation cursor and SHALL remain JSON-safe

#### Scenario: A caller requests unrestricted internals
- **WHEN** a caller attempts to obtain SQL, table names, arbitrary paths, raw rows, executable values, or a full unbounded snapshot
- **THEN** the contract SHALL provide no representable operation or field for that request

### Requirement: Isolated snapshots are coherent

The repository SHALL capture a bounded basis transactionally, canonical Topic descriptors SHALL be inspected outside SQLite, and the repository basis SHALL be recaptured before a snapshot is returned.

#### Scenario: Repository and canonical basis remain stable
- **WHEN** both captures identify the same repository basis and canonical descriptors validate within bounds
- **THEN** the application SHALL return one coherent isolated snapshot with missing and corrupt canonical states represented explicitly

#### Scenario: Basis changes during inspection
- **WHEN** repository or canonical basis changes before recapture completes
- **THEN** the application SHALL return `superseded` and SHALL NOT return a mixed snapshot payload

### Requirement: Debug reads have no side effects

Status, schema, cache, operation, snapshot, paper, Topic, diff, and profiler reads SHALL NOT invoke repair, cache rebuild, operation creation, domain mutation, repository write, or canonical promotion.

#### Scenario: Every read projection is exercised
- **WHEN** callers inspect every supported read projection
- **THEN** repository and canonical write counts SHALL remain unchanged

### Requirement: Maintenance reuses safe owners

Checkpoint export/verify, durable preview/apply/export, and isolated reset SHALL delegate to their existing applications and confirmation-protected repository owner rather than introducing a second mutation implementation.

#### Scenario: A protected reset is requested
- **WHEN** reset lacks the exact required confirmation or the application is stopping
- **THEN** reset SHALL fail closed with no repository mutation

#### Scenario: Durable or checkpoint maintenance runs
- **WHEN** a supported maintenance operation is admitted
- **THEN** receipts, CAS, recovery, bounds, and output formats SHALL be owned by the existing checkpoint or durable application

### Requirement: Profiling is optional and redacted

Profiler inspection SHALL consume only an optional strict redacted port and SHALL return a stable unavailable result when the port is absent.

#### Scenario: Private Node composition has no profiler
- **WHEN** profiler status is inspected in private Node composition
- **THEN** the application SHALL return `unavailable` without probing Host, filesystem, or runtime internals

### Requirement: Private lifecycle is dependency safe

The application SHALL enforce single-active admission, stop new work, drain active work, and close before WebDAV, durable, checkpoint, domain, canonical, and repository dependencies.

#### Scenario: Shutdown overlaps maintenance
- **WHEN** shutdown begins while one maintenance operation is active
- **THEN** new operations SHALL be rejected and dependency closure SHALL wait for the active operation

#### Scenario: The private foundation is packaged
- **WHEN** runtime and XPI inventories are checked
- **THEN** the foundation SHALL be present without a public route, worker operation, `SynthesisClient`, Workbench, Host Bridge, MCP, or production mutation capability

### Requirement: Production debug and maintenance surfaces remain compatible

Production `debugSynthesis*`, maintenance DTOs, method names, Host Bridge, CLI, and MCP results SHALL remain unchanged while bounds, canonicalization, schema projection, and pure diff delegate to shared SSOT.

#### Scenario: Production compatibility suites execute
- **WHEN** established debug, maintenance, Host Bridge, CLI, MCP, reset, and inventory tests run
- **THEN** externally observable fields and behavior SHALL remain unchanged and inventory SHALL remain `108 methods / 1 direct consumer`

### Requirement: WS5 exit gates are executable

The project SHALL prove isolated private use cases, environment-neutral package boundaries, short transaction scope, compute-worker ownership boundaries, complete capability disposition, and packaging/inventory closure before marking WS5 complete.

#### Scenario: WS5 closure is evaluated
- **WHEN** Core, boundary, invariant, runtime, XPI, and migration-inventory checks pass on an isolated root
- **THEN** every production capability SHALL be classified as shared/private implemented, existing safe owner, production-compatible adapter, or outside WS5 and WS6 SHALL be identified as next
