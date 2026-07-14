# acp-runtime-replay-profiler Specification

## Purpose
Backend-free replay profiling for ACP runtime sessions. The replay engine replays validated semantic traces through source-specific synthetic seams, producing a fixed nine-run surface matrix (3 surfaces x 3 runs each) that serves as the comparable real-workload governance baseline. Replay is isolated from real backends, preserves Workspace rendering invariants, and injects versioned safe R2 synthetic work during profile windows.

## Requirements

### Requirement: Replay is backend-free and source-specific

The replay engine SHALL reject incomplete, corrupt, or cross-source traces before setup. Chat replay SHALL use synthetic Chat conversation projection/store/persistence/publication seams; Workflow replay SHALL use synthetic workflow/request Skills run/transcript/publication seams. Every replay SHALL use fresh synthetic owners while preserving trace-local semantic correlation IDs.

#### Scenario: Cross-source replay is requested
- **WHEN** a Chat trace is supplied to the Workflow target or a Workflow trace to the Chat target
- **THEN** replay SHALL fail before creating owners or changing Workspace state.

#### Scenario: Replay applies semantic notifications
- **WHEN** a validated trace is replayed
- **THEN** the target SHALL use the shared transcript boundary classifier and its source-specific projection
- **AND** no transport, subprocess, backend, model, MCP, real permission response, Host Bridge capability, library mutation, convergence, apply-back, or original-workspace write SHALL occur.

### Requirement: Replay cadence preserves event order

Recorded cadence SHALL wait each original monotonic gap after the preceding consumer completes and SHALL NOT issue catch-up bursts. Burst cadence SHALL apply the next event immediately after the preceding consumer completes.

#### Scenario: Recorded consumer is slow
- **WHEN** consuming an event takes longer than the next recorded gap
- **THEN** the following full gap SHALL still be awaited before the next event is applied.

#### Scenario: Replay cannot fully drain
- **WHEN** an event is unknown, a consumer fails, replay aborts, or an explicit drain fails
- **THEN** the affected run and matrix SHALL be incomplete with applied, skipped, unknown, lag, and drain status retained.

### Requirement: One action produces a fixed nine-run surface matrix

The runner SHALL execute surfaces in `closed`, `open-inactive`, `target-active` order, with one warm-up and two formal runs per surface. Setup, switching, drain, cleanup, and restoration SHALL occur outside profile windows, and the user's prior Workspace state SHALL be restored after success, failure, or abort.

#### Scenario: Matrix completes
- **WHEN** the user starts one replay operation
- **THEN** exactly three warm-up and six formal profile records SHALL be produced
- **AND** every record SHALL use distinct synthetic owners.

#### Scenario: Surface state is prepared
- **WHEN** a Chat or Workflow run enters a surface
- **THEN** `closed` SHALL close Workspace, `open-inactive` SHALL activate the opposite ACP tab, and `target-active` SHALL activate the matching tab and synthetic owner
- **AND** shell, owner, and publication drains SHALL complete before profiling starts.

### Requirement: Replay injects versioned safe R2 work

Every profile window SHALL inject `ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1`: one single-frame health request, one 16-fragment health request with 5 ms fragment gaps, and eight concurrent two-fragment health requests through parser/input/no-op response seams only.

#### Scenario: R2 v1 completes
- **WHEN** a replay profile window runs
- **THEN** request, fragment, concurrency, and byte counts SHALL match the versioned workload
- **AND** no mutation dispatch SHALL be reachable.

### Requirement: Replay matrices preserve provenance and comparability

The runner SHALL write `zotero-agents.acp-runtime-replay-matrix.v1` JSON and a three-surface Markdown summary containing trace schema/digest, source kind, cadence, R2 version, replay configuration, plugin/Zotero environment, nine records, run roles, counts, bytes, scheduler lag, warnings, and drain status. Only complete formal runs with identical provenance SHALL be compared.

#### Scenario: Incompatible matrices are compared
- **WHEN** trace digest, source kind, cadence, R2 version, or replay configuration differs
- **THEN** the system SHALL reject governance comparison.

#### Scenario: R1 differs by surface
- **WHEN** a derived R1 metric changes across surfaces
- **THEN** the report SHALL retain the difference as a finding rather than force normalization.

### Requirement: Replay preserves Workspace rendering isolation

Replay publication SHALL preserve transcript-only DOM identity, owner-first and page-first selection, pinned live mirrors, owner-scoped cold caches, and region-local signature guards.

#### Scenario: Transcript event is replayed
- **WHEN** a replayed event changes only transcript state
- **THEN** toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, and unrelated managed regions SHALL retain DOM identity.

### Requirement: Replay artifacts MUST expose human-readable sample and stage identity

Replay MUST require a normalized free-text governance stage, derive a sample name from the selected trace filename, and retain both values in result provenance and paired artifact filenames.

#### Scenario: User enters a governance stage

- **WHEN** a complete trace is selected and the user enters a valid non-empty stage
- **THEN** Replay MUST preserve the normalized exact stage in `replayConfig.phase`
- **AND** retry, cancellation, failure, preflight, and path selection MUST NOT discard the in-session stage draft

#### Scenario: Stage is invalid

- **WHEN** the stage is empty, exceeds the supported length, or contains a control character
- **THEN** Replay MUST reject the start before target setup or Workspace changes
- **AND** Dashboard MUST expose a structured validation state without relying on a complete error sentence

#### Scenario: Replay results are persisted

- **WHEN** Replay saves a complete or incomplete matrix
- **THEN** the JSON and Markdown filenames MUST share a stem containing the trace filename-derived sample slug, stage slug, timestamp, and collision-safe nonce
- **AND** the exact sample display name and stage MUST appear in JSON and Markdown provenance
- **AND** trace digest rather than sample display name MUST remain the comparison identity

### Requirement: Replay progress MUST distinguish current and completed matrix slots

Replay MUST publish the current surface, run role, run index, matrix position, and start time separately from the last completed record.

#### Scenario: A matrix slot starts

- **WHEN** the runner is about to prepare a matrix slot
- **THEN** it MUST await current-slot publication before target preparation and profile start
- **AND** that publication MUST occur outside the profile window

#### Scenario: A matrix slot completes

- **WHEN** profiler finish and target cleanup complete
- **THEN** Replay MUST update completed progress and structured per-record evidence
- **AND** cancellation, failure, or terminal completion MUST clear current-slot state

### Requirement: Dashboard MUST present Replay evidence through progressive disclosure

The unified ACP Trace & Replay surface MUST prioritize identity, validation, required inputs, matrix progress, errors, and formal surface summaries while keeping advanced configuration and detailed evidence accessible without dominating the default view.

#### Scenario: Replay is running

- **WHEN** a matrix is in progress
- **THEN** Dashboard MUST render nine slots grouped by `closed`, `open-inactive`, and `target-active`
- **AND** pending, current, complete, incomplete, and warning states MUST be distinguishable without depending on color alone

#### Scenario: Replay results are available

- **WHEN** one or more formal records exist
- **THEN** Dashboard MUST show per-surface completion, elapsed mean/range, events/s, and MiB/s summaries
- **AND** per-record R1/R2/R3 coverage, drain, warnings, raw metadata, and output paths MUST remain available in expandable details

#### Scenario: Only one diagnostic source is enabled

- **WHEN** Recorder or Replay is independently source-disabled
- **THEN** the available step MUST remain usable without treating the absent step as an error
- **AND** disabled diagnostic modules MUST retain their existing release-elision behavior
