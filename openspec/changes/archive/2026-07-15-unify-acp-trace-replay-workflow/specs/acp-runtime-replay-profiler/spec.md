## MODIFIED Requirements

### Requirement: One action produces a fixed nine-run surface matrix

The runner SHALL execute surfaces in `closed`, `open-inactive`, `target-active` order, with one warm-up and two formal runs per surface. Setup, switching, progress publication, cleanup, and restoration SHALL occur outside profile windows, and the user's prior Workspace state SHALL be restored after success, failure, or abort. A user abort SHALL stop future runs and produce an incomplete matrix containing all finished records.

#### Scenario: Matrix reports progress
- **WHEN** a replay record finishes profiling and target cleanup
- **THEN** the controller SHALL publish its surface, role, run index, and completed count before the next profile window begins.

#### Scenario: Open surface becomes ready asynchronously
- **WHEN** Workspace opening returns before its shell or active child is ready
- **THEN** Replay SHALL wait for shell readiness, child readiness, matching target owner, and rendered initialization acknowledgement before starting the profiler.

#### Scenario: Child readiness survives Workspace target commits
- **WHEN** an initialized child iframe remains attached while Workspace closes, reopens, or changes target
- **THEN** its readiness SHALL remain valid for that shell document, and host initialization SHALL request an idempotent ready declaration so an earlier rejected or lost declaration can recover.

#### Scenario: Child document is replaced
- **WHEN** the shell frame window or child document is replaced
- **THEN** prior readiness SHALL be discarded and the replacement child SHALL complete a new ready handshake.

#### Scenario: Profile publication is drained
- **WHEN** trace and R2 consumption finish for an open surface
- **THEN** Replay SHALL wait for the active child to acknowledge the final rendered snapshot before finishing the profiler; closed SHALL require no R3 publication.

#### Scenario: Workflow target-active selects a real replay owner
- **WHEN** a Workflow trace contains one or more ACP requests
- **THEN** the first mapped request SHALL use the selected `${syntheticRootId}-request` owner and later requests SHALL remain distinct.

#### Scenario: Replay is canceled
- **WHEN** the user cancels a running matrix, including during a recorded cadence gap
- **THEN** the wait SHALL be interrupted, future runs SHALL not start, completed records SHALL be retained in an incomplete matrix, and Workspace state SHALL be restored.

#### Scenario: Zotero does not expose browser cancellation globals
- **WHEN** replay starts in a Zotero module scope without a global `AbortController`
- **THEN** it SHALL enter the running state, remain cancelable, and surface any later failure instead of silently rejecting its start action.

### Requirement: Replay traces are selected and validated locally

The debug Dashboard SHALL expose one two-step `ACP Trace & Replay` surface. It SHALL support editable local paths and the native Zotero file picker, validate traces through the semantic trace parser, and show schema, source kind, digest, creation time, event count, bytes, and completeness before or during Run. Saving a Recorder trace SHALL select and preflight it without starting replay.

#### Scenario: User types a path
- **WHEN** the path changes from empty to non-empty or back to empty
- **THEN** Run availability SHALL update immediately in the existing DOM without waiting for a Dashboard snapshot.

#### Scenario: Native trace is selected
- **WHEN** the user chooses a complete `.ndjson` trace through the host file picker
- **THEN** the selected path SHALL be preflighted and its metadata SHALL appear in the Replay step.

#### Scenario: Trace preflight fails
- **WHEN** the path is missing, corrupt, incomplete, or unsupported
- **THEN** the failure SHALL be displayed inline, no Workspace state SHALL change, and the user SHALL be able to select another trace or retry.

### Requirement: Replay execution is recoverable

The Replay controller SHALL preserve the selected trace, phase, and cadence across complete, incomplete, canceled, and failed attempts. It SHALL expose live progress, cancel, result paths, warnings, and inline errors, and SHALL permit retry with fresh synthetic owners.

#### Scenario: Replay fails or is canceled
- **WHEN** an attempt reaches a failed, incomplete, or canceled terminal state
- **THEN** the selected trace and options SHALL remain available and a subsequent Run SHALL create fresh owners.

### Requirement: Replay performance evidence is complete and attributable

Replay SHALL emit matrix v2 with separate execution and measurement completion.
It SHALL aggregate only explicitly registered synthetic owners into the current
root profile, classify semantic events as projected, consumed-noop, skipped, or
unknown, measure the fixed R2 parser/no-op response workload, and attribute R3
only to the matching source target and matrix surface.

#### Scenario: Workflow owners contribute to one run profile
- **WHEN** a Workflow replay maps one or more request owners
- **THEN** their projection, persistence, change, and transcript metrics SHALL aggregate into the current synthetic root without accepting unrelated request ids.

#### Scenario: Replay has no transport
- **WHEN** semantic events are replayed without a backend
- **THEN** adapter, JSON-RPC, and transport metric families SHALL be explicitly not-applicable while semantic event and projection metrics remain captured.

#### Scenario: R2 uses the measured safe seam
- **WHEN** the versioned R2 workload runs
- **THEN** it SHALL report 10 requests, 33 fragments, 536 input bytes, maximum concurrency 8, measured input/request/response metrics, and zero mutation dispatch.

#### Scenario: Surface measurement is attributable
- **WHEN** the same trace runs across the three surfaces
- **THEN** closed SHALL have no R3, open-inactive SHALL not measure the opposite active tab and SHALL normally report expected-zero target publication, and target-active SHALL capture matching prepare, signature, post, and render acknowledgement.

#### Scenario: Required metrics are missing
- **WHEN** replay execution completes but a required measurement family is absent or dropped
- **THEN** execution SHALL remain complete, measurement SHALL be incomplete, and the structured missing reason SHALL appear in JSON and Markdown.

### Requirement: Replay reports summarize formal evidence

The Markdown report SHALL summarize the two formal runs per surface with wall
time, range, throughput, relative closed delta, event disposition, R2 workload,
R1/R2/R3 metrics, and coverage. Warm-up SHALL remain visible but excluded from
aggregation, and the report SHALL state that n=2 is descriptive only.

#### Scenario: Legacy matrix is opened
- **WHEN** a v1 result is loaded
- **THEN** it SHALL be identified as legacy measurement-incomplete evidence and SHALL NOT be comparable with v2.
