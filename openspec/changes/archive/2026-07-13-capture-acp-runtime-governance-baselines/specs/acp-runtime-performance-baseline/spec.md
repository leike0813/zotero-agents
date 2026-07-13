## ADDED Requirements

### Requirement: Automated baseline records production-path workload

The repository SHALL generate a deterministic before-governance mechanism
record by driving the production test seams for R1 JSON-RPC and persistence,
R2 Host Bridge input and handling, R3 Assistant Workspace publication, and
buffered runtime work. The fixture SHALL NOT construct its expected workload by
calling metric recorder APIs directly.

#### Scenario: Repeated fixture is deterministic

- **WHEN** the baseline command executes the same fixed workload twice
- **THEN** its normalized counters, bytes, gauge peaks, duration invocation
  counts, attribution, and completion state SHALL be identical
- **AND** machine-specific elapsed-time values SHALL NOT be part of the
  deterministic comparison.

#### Scenario: Before-governance evidence is protected

- **WHEN** a before-governance artifact already exists
- **THEN** the baseline command SHALL refuse to replace it unless the caller
  explicitly requests force replacement.

### Requirement: Baseline records have one sanitized contract

Automated and Zotero-host captures SHALL use the versioned
`zotero-agents.acp-runtime-governance-baseline.v1` contract and one R1/R2/R3
metric-group mapping. Records SHALL exclude raw samples, user prompt/output
text, commands, paths, backend identifiers, provider identifiers, and workflow
identifiers.

#### Scenario: Automated record is exported

- **WHEN** the deterministic fixture completes
- **THEN** the repository SHALL contain a JSON record and a concise Markdown
  report identified as `before-governance`
- **AND** the record SHALL state that it is a mechanism baseline rather than a
  real-host latency measurement.

#### Scenario: Real-host record is exported

- **WHEN** a completed Zotero capture is saved
- **THEN** the record SHALL contain the same grouped mechanism summary plus the
  bounded real-host duration and histogram snapshot
- **AND** it SHALL describe the Zotero/plugin/platform capture environment.

### Requirement: Debug Dashboard controls real-host capture

The Task Manager Dashboard SHALL expose a dedicated ACP Runtime Profiler tab
only while debug mode and the hard-coded profiler feature switch are enabled.
Start, refresh, stop, inspect, save, copy, and open-folder operations SHALL be
contained in that tab and SHALL NOT require changes to another Dashboard tab.

#### Scenario: Capture is stopped after terminal state

- **WHEN** the user starts a capture, completes the ACP workload, and stops it
- **THEN** the recorder SHALL freeze an immutable snapshot before releasing its
  active state and timer
- **AND** the tab SHALL retain the result for inspection and export.

#### Scenario: Capture is stopped with active profiles

- **WHEN** the user stops a capture while request profiles remain active
- **THEN** the record SHALL be retained with an `incomplete` completion state
- **AND** the Dashboard SHALL show a structured warning.

#### Scenario: Dashboard observation is explicit

- **WHEN** a profiler capture is recording
- **THEN** Dashboard periodic or task-update refresh SHALL NOT snapshot the
  profiler automatically
- **AND** only explicit refresh, stop, or save actions SHALL read profiler data.

### Requirement: Real-host captures are durable local diagnostics

The Dashboard SHALL save real-host captures atomically under the Zotero Agents
runtime profile directory and SHALL provide copy and folder-reveal actions. It
SHALL NOT automatically delete saved captures.

#### Scenario: Capture save succeeds

- **WHEN** the user saves a frozen capture
- **THEN** a uniquely named JSON file SHALL become visible only after the full
  payload has been written
- **AND** the Dashboard SHALL expose its path and containing folder.

### Requirement: Profiler surfaces preserve rendering isolation

Profiler availability, state, revisions, and metrics SHALL NOT enter Assistant
Workspace snapshots, transcript keys, Dashboard chrome signatures, or unrelated
Dashboard selected-surface signatures.

#### Scenario: Profiler snapshot changes

- **WHEN** a profiler snapshot changes while its Dashboard tab is selected
- **THEN** only the profiler selected-surface signature MAY change
- **AND** no Assistant Workspace or unrelated Dashboard managed region SHALL be
  rebuilt because of that change.
