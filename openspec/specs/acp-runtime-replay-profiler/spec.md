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
