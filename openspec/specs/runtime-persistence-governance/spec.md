# runtime-persistence-governance Specification

## Purpose
Runtime Persistence Governance defines how plugin-managed runtime data is
observed, checked, and cleaned. Runtime persistence separately owns managed
paths and cross-runtime filesystem adapter selection.

## Requirements

### Requirement: Runtime Persistence Governance exposes one consolidated interface

Runtime Persistence Governance SHALL own combined usage and integrity scans,
category cleanup, issue cleanup, and age-based retention behind one module
interface. Filesystem adapter selection and managed path policy SHALL remain in
runtime persistence.

#### Scenario: Preferences scan managed runtime data

- **WHEN** preferences requests a governance scan
- **THEN** one governance operation SHALL return the existing usage snapshot and integrity report
- **AND** callers SHALL NOT compose the two scans themselves.

#### Scenario: Governance performs cleanup

- **WHEN** category, issue, or retention cleanup is requested
- **THEN** governance SHALL determine eligible records and paths
- **AND** physical filesystem work SHALL use runtime persistence operations.

### Requirement: SQLite state stores indexed operational state

Runtime persistence governance SHALL separate plugin workflow/runtime SQLite state from Synthesis SQLite state.

#### Scenario: Runtime paths expose separate databases

- **WHEN** the plugin resolves runtime persistence paths
- **THEN** `stateDbPath` SHALL point to `state/zotero-agents.db`
- **AND** `synthesisDbPath` SHALL point to `state/synthesis.db`.

#### Scenario: Workflow runtime state remains in the plugin DB

- **WHEN** workflow execution, ACP, SkillRunner, workflow product metadata, or plugin task persistence writes indexed operational state
- **THEN** it SHALL use `state/zotero-agents.db`.

#### Scenario: Synthesis uses the Synthesis DB

- **WHEN** Synthesis needs state for UI, MCP, Host Bridge, review actions, workers, operation progress, or graph queries
- **THEN** it SHALL use indexed SQLite tables in `state/synthesis.db`
- **AND** it SHALL NOT store that hot state in `state/zotero-agents.db`, prefs, runtime files, or `plugin_task_rows.payload_json`.

### Requirement: Runtime SQLite access is concurrency guarded

Plugin-owned access to runtime SQLite databases SHALL use guarded SQLite execution paths.

#### Scenario: Same-path plugin transactions are coordinated

- **WHEN** plugin-owned runtime persistence code opens or writes `state/zotero-agents.db` or `state/synthesis.db`
- **THEN** access for the same normalized DB path SHALL reuse one guarded connection/coordinator inside the process
- **AND** nested guarded transactions on that connection SHALL not issue nested `BEGIN IMMEDIATE` statements.

### Requirement: Runtime persistence usage exposes cleanable runtime categories

Runtime persistence governance SHALL expose cleanable runtime data categories for prefs diagnostics and cleanup.

#### Scenario: Workflow product runtime data is scanned

- **WHEN** runtime persistence usage is scanned
- **THEN** the usage snapshot SHALL include a `workflow-products` category for `runtime/workflow-products`
- **AND** its bytes SHALL include managed product asset files plus indexed `workflow-products/products` row payload bytes
- **AND** its record count SHALL include `workflow-products/products` rows.

#### Scenario: Workflow product runtime data is cleaned

- **WHEN** cleanup is requested for `workflow-products`
- **THEN** runtime persistence governance SHALL clear `workflow-products/products` rows
- **AND** delete `runtime/workflow-products`
- **AND** leave original run workspaces untouched.

### Requirement: Runtime persistence usage exposes state databases

Runtime persistence governance SHALL expose both runtime SQLite databases for diagnostics without making them generic cleanable categories.

#### Scenario: Runtime persistence usage is scanned

- **WHEN** runtime persistence usage is scanned
- **THEN** the usage snapshot SHALL include `state/zotero-agents.db`
- **AND** it SHALL include `state/synthesis.db`
- **AND** neither database SHALL be removed by runtime retention cleanup.

### Requirement: Runtime persistence governance MUST treat runtime logs as file-backed operational diagnostics

Runtime persistence governance MUST treat retained runtime log documents as file-backed operational diagnostics, not as prefs-primary state.

#### Scenario: Runtime log file is the durable diagnostic artifact

- **WHEN** runtime persistence paths are available
- **THEN** retained runtime log documents SHALL be persisted under the runtime persistence area
- **AND** prefs SHALL only serve as a legacy migration or fallback input.

#### Scenario: Clearing runtime logs clears file-backed diagnostics

- **WHEN** runtime logs are cleared through the runtime log pipeline
- **THEN** the file-backed runtime log document SHALL be cleared
- **AND** stale migrated pref content SHALL NOT be preserved as an alternate source of truth.

### Requirement: Runtime persistence naming remains compatibility-safe

The system SHALL use `zotero-agents` for current visible persistence root
defaults and examples while continuing to recognize legacy `zotero-skills`
locations during migration and diagnostics.
The system SHALL use platform services for current visible persistence root
defaults, managed child path construction, and runtime-root diagnostics while
continuing to recognize legacy `zotero-skills` locations during migration and
diagnostics.

#### Scenario: Current default paths are visible
- **WHEN** preferences, docs, or diagnostics describe the current managed
  persistence root
- **THEN** they describe `zotero-agents` paths.

#### Scenario: Legacy identifiers remain recognized
- **WHEN** migration or compatibility code checks existing runtime roots,
  database files, or environment overrides
- **THEN** it SHALL continue to support the existing legacy names required for
  safe upgrades.

#### Scenario: Explicit runtime root is Windows-shaped

- **GIVEN** the configured runtime root is a Windows absolute path
- **WHEN** runtime persistence paths are resolved
- **THEN** child paths SHALL preserve Windows path shape
- **AND** the path SHALL NOT be reinterpreted as a POSIX relative repository
  path.

#### Scenario: Explicit runtime root is POSIX-shaped

- **GIVEN** the configured runtime root is a POSIX absolute path
- **WHEN** runtime persistence paths are resolved
- **THEN** child paths SHALL preserve POSIX path shape.

### Requirement: Sidecar runtime installs have a fixed managed persistence root


Runtime persistence SHALL reserve
`runtime/synthesis/service-runtime` for product-owned Synthesis runtime
versions, staging directories, and active/previous pointers.

#### Scenario: Installer creates or repairs a runtime

- **WHEN** the Synthesis runtime installer writes, moves, verifies, or removes
  runtime assets
- **THEN** every affected path SHALL remain below the fixed service-runtime root
- **AND** arbitrary user or manifest-provided absolute paths SHALL not be used.

### Requirement: Runtime pointer replacement is atomic


Runtime persistence SHALL provide a fail-closed atomic text
replacement primitive for managed pointer files.

#### Scenario: Atomic replacement is available

- **WHEN** active or previous runtime pointer content is updated
- **THEN** a complete temporary sibling SHALL be atomically moved over the
  target
- **AND** readers SHALL observe either the prior or complete new document.

#### Scenario: Atomic replacement is unavailable

- **WHEN** the runtime cannot guarantee atomic replacement
- **THEN** the pointer update SHALL fail
- **AND** it SHALL not fall back to remove-then-write behavior.

### Requirement: Sidecar lifecycle files remain profile and instance scoped


Runtime persistence SHALL derive all sidecar lifecycle files below the fixed
service-runtime profile directory and SHALL support atomic private text writes.

#### Scenario: Supervisor creates a session
- **WHEN** a profile-scoped sidecar session starts
- **THEN** config and lease paths SHALL remain below that profile and session
- **AND** private POSIX files SHALL use owner-only permissions.

#### Scenario: Lifecycle cleanup runs
- **WHEN** a service or supervisor cleans discovery, owner, or session state
- **THEN** it SHALL first verify matching profile, supervisor, and service
  identities
- **AND** it SHALL not delete another instance's state.

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

### Requirement: Runtime persistence audits Workflow Product objects

Runtime persistence integrity SHALL derive referenced Product objects from strict v2 records and SHALL treat unreferenced revisions and legacy directories as orphan data.

#### Scenario: Managed Product object is indexed

- **WHEN** integrity scanning visits an available v2 asset
- **THEN** it SHALL derive the expected object path from Product identity, revision, and logical asset identity
- **AND** report a missing object without trusting a persisted absolute path.

#### Scenario: Unpublished revision remains after interruption

- **WHEN** a revision directory is not referenced by any v2 Product row
- **THEN** integrity scanning SHALL report its files as orphan data
- **AND** existing orphan TTL policy SHALL govern cleanup eligibility.

#### Scenario: Product migration is incomplete

- **WHEN** one or more legacy rows cannot be migrated
- **THEN** persistence diagnostics SHALL expose a retryable migration-incomplete state
- **AND** SHALL not publish a mixed-layout Product view.

### Requirement: Runtime filesystem adapters support strict and tolerant interfaces

Plugin-owned runtime filesystem access SHALL use one runtime adapter selection
implementation while preserving distinct strict and tolerant caller semantics.

#### Scenario: Tolerant persistence read targets a missing file

- **WHEN** an existing tolerant persistence reader targets a missing path
- **THEN** it SHALL return its documented empty result
- **AND** the missing path SHALL NOT be reported as a successful strict read.

#### Scenario: Strict workflow read targets a missing file

- **WHEN** a strict workflow-facing reader targets a missing or invalid path
- **THEN** it SHALL reject deterministically
- **AND** it SHALL NOT reinterpret the result as empty file content.

#### Scenario: Strict workflow write has no runtime adapter

- **WHEN** no supported asynchronous runtime adapter can write a file or create
  its parent directory
- **THEN** the strict operation SHALL reject
- **AND** it SHALL NOT report a successful no-op.

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

### Requirement: Temporary cleanup SHALL respect active attachment ownership

Runtime temporary-category cleanup SHALL refuse deletion while attachment preparation, stored mutation, or an upload lease owns temporary content, and SHALL report the in-use state. Cleanup admission and acquisition SHALL not race into deletion of active input.

#### Scenario: Cleanup races with an attachment import

- **WHEN** temporary cleanup is requested while an attachment preparation scope or upload lease is active
- **THEN** cleanup reports that the category is in use and does not remove its files

#### Scenario: No attachment work owns temporary content

- **WHEN** temporary cleanup is requested after all attachment scopes and leases have been released
- **THEN** existing temporary-category cleanup remains available

### Requirement: Filesystem effects SHALL use complete safe operation paths

Runtime persistence SHALL validate complete file, directory, and component path
budgets against the actual operation's native or interoperability capability
before filesystem effects. Relative paths SHALL include their absolute
working-directory basis. Inventory warnings SHALL NOT authorize an over-budget
operation.

#### Scenario: Applying platform budgets

- **WHEN** a complete destination is validated
- **THEN** Windows interoperability files SHALL fit 259 UTF-16 units and directories 247, excluding NUL
- **AND** native Windows operations SHALL admit supported extended paths within the native complete-path budget
- **AND** components SHALL fit 255 UTF-16 units on Windows or 255 UTF-8 bytes on POSIX
- **AND** POSIX paths SHALL fit the runtime's byte budget
- **AND** generated portable names SHALL retain their separate UTF-8 cap.

#### Scenario: Generated intermediate paths would exceed the budget

- **WHEN** an atomic write or directory copy needs staging or backup paths
- **THEN** it SHALL use short internal names independent of the destination basename
- **AND** every known final and intermediate destination SHALL be validated before old content is moved
- **AND** insufficient remaining budget SHALL fail with structured numeric evidence under the required consumer policy.

#### Scenario: A temporary directory already belongs to another owner

- **WHEN** exclusive reservation finds an existing directory
- **THEN** reservation SHALL fail as a conflict
- **AND** the failed claimant SHALL NOT write into or remove that directory.

#### Scenario: Moving a directory would lengthen a child beyond its budget

- **WHEN** a directory move contains an over-budget descendant destination or cannot complete bounded inspection
- **THEN** the move SHALL fail before changing the source or destination.

#### Scenario: Archive extraction contains an unsafe complete destination

- **WHEN** any known ZIP member destination is over budget
- **THEN** extraction SHALL fail before writing the first member
- **AND** workflow bundle extraction SHALL preflight the member identities used by its extractor.

#### Scenario: Native overwrite is rejected

- **WHEN** the filesystem rejects an overwrite
- **THEN** runtime persistence SHALL preserve the failure
- **AND** SHALL NOT delete the old file in order to retry creation.

#### Scenario: Tree promotion outcome cannot be inspected

- **WHEN** a tree move may have taken effect and subsequent inspection fails
- **THEN** possible backups SHALL remain available
- **AND** an inspection error SHALL NOT be interpreted as evidence of absence for cleanup.

### Requirement: Native Windows paths SHALL remain an adapter detail

Ordinary supported Windows file operations SHALL accept long absolute paths
without requiring a system-setting change. All native path arguments and
derived paths SHALL be adapted consistently. Public descriptors SHALL retain
ordinary paths. Invalid device namespaces and unsupported capabilities SHALL
fail safely.

#### Scenario: Long source is copied to a short target

- **WHEN** a readable ordinary Windows source exceeds the interoperability limit
- **THEN** a native-capable copy SHALL preserve its bytes without rejecting it solely at 259 units.

#### Scenario: An enumerated child is used again

- **WHEN** a native long directory is enumerated and its returned child is read or copied
- **THEN** the returned path SHALL be usable through the same public file interface without exposing an internal extended prefix.

### Requirement: Compatibility staging SHALL preserve ownership and output identity

Generated temporary paths SHALL use bounded physical names independent of
display and run identities. A short-path-only consumer SHALL receive an owned
compatible copy when necessary. Compatible copies SHALL participate in
temporary usage, retention and in-use protection. Completed output SHALL be
staged on the destination volume before atomic publication.

#### Scenario: Display name would produce a long staging target

- **WHEN** a workflow stages a file with a long display name or run identity
- **THEN** it SHALL allocate a unique bounded physical path and preserve the display identity.

#### Scenario: Managed staging root is too deep

- **WHEN** the managed temporary root cannot fit known interoperability destinations
- **THEN** a validated system-temporary candidate SHALL be used without moving existing data
- **AND** if no candidate fits the operation SHALL fail before touching the target.

#### Scenario: Temporary cleanup races a compatibility consumer

- **WHEN** compatibility input or recovery output is still owned by an active operation
- **THEN** cleanup SHALL report in-use and preserve those bytes and other profiles' directories.
