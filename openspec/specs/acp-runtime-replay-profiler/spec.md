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

### Requirement: Replay cadence preserves its declared timing model

Replay SHALL support `recorded`, `logical`, and `burst` cadence. Recorded SHALL wait for trace gaps, burst SHALL skip trace-gap waits, and logical SHALL advance a run-scoped logical clock while preserving replay-owned timer deadline and registration ordering. Missing cadence SHALL default to recorded and unknown cadence SHALL be rejected.

#### Scenario: Recorded consumer is slow
- **WHEN** consuming an event takes longer than the next recorded gap
- **THEN** the following full gap SHALL still be awaited before the next event is applied.

#### Scenario: Replay cannot fully drain
- **WHEN** an event is unknown, a consumer fails, replay aborts, or an explicit drain fails
- **THEN** the affected run and matrix SHALL be incomplete with applied, skipped, unknown, lag, and drain status retained.

#### Scenario: Logical replay crosses timer deadlines
- **WHEN** logical replay advances from one trace offset to another
- **THEN** all owned timer deadlines at or before the new offset SHALL execute before the event at that offset, with equal deadlines ordered by registration
- **AND** callback-created due work SHALL execute in a later callback batch rather than recursive synchronous execution.

#### Scenario: Logical replay reaches the trace tail
- **WHEN** an owned timer deadline is later than the final trace offset
- **THEN** Replay SHALL restore it to native scheduling using the remaining delay before target drain
- **AND** logical-scope disposal SHALL NOT cancel the restored native timer.

#### Scenario: Logical replay is canceled or fails
- **WHEN** cancellation, event consumption, drain, profiler finish, or cleanup fails
- **THEN** Replay SHALL release future timers to native scheduling, preserve write-bearing work, dispose logical ownership, restore Workspace state, and retain incomplete evidence.

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

### Requirement: Replay artifacts MUST expose sample, stage, and cadence identity

Replay MUST require a normalized free-text governance stage, derive a sample name from the selected trace filename, and retain the sample, stage, and selected cadence in result provenance and paired artifact filenames. A default source-identifiable trace filename MUST retain its `chat` or `skills` token in the derived sample and paired Replay artifact stem.

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
- **THEN** the JSON and Markdown filenames MUST share a stem containing the trace filename-derived sample slug, stage slug, cadence, timestamp, and collision-safe nonce
- **AND** the exact sample display name, stage, and cadence MUST appear in JSON and Markdown provenance
- **AND** trace digest rather than sample display name MUST remain the comparison identity

#### Scenario: Source-identifiable trace is replayed

- **WHEN** Replay selects `acp-trace-chat-*` or `acp-trace-skills-*`
- **THEN** its paired result filenames MUST begin with `acp-replay-chat-*` or `acp-replay-skills-*` respectively
- **AND** Replay SHALL NOT maintain a second source-to-filename mapping.

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

### Requirement: Logical replay owns only synthetic timer work

Logical replay SHALL take ownership only of timers attributable to the current synthetic Chat conversation, Skills request owners, or prepared Workspace target. Existing, mixed-owner, replaced, early-fired, or background timers SHALL remain native and SHALL produce structured contamination evidence.

#### Scenario: A global pending timer mixes owners
- **WHEN** a Skills change timer contains any request id outside the current logical replay run
- **THEN** Replay SHALL NOT detach the timer and measurement SHALL become incomplete with `logical-timer-contamination`.

#### Scenario: Workspace publication is not cleanly owned
- **WHEN** Workspace has baseline pending publication, changes host, or receives unrelated background publication
- **THEN** Replay SHALL leave the timer native and report logical timer contamination.

### Requirement: Disabled and inactive replay adds no business hot-path work

The production Chat, Skills, and Workspace snapshot, render, publication, and timer paths SHALL retain their direct business behavior without Replay state, scheduler lookup, profile-context computation, Map lookup, synthetic helper, acknowledgement branch, additional allocation, or logical module initialization. Logical replay modules, synthetic control bodies, Replay production ports, and publication acknowledgement sidecars SHALL be elided when Debug or Replay Profiler source is disabled.

#### Scenario: Replay Profiler source is disabled

- **WHEN** a diagnostic bundle is built with Replay Profiler source disabled
- **THEN** logical scheduler code, synthetic helpers, Replay publication sidecars, and replay-only timer or acknowledgement markers SHALL contribute zero output bytes.

#### Scenario: Production plugin entry is bundled

- **WHEN** the real plugin entry is built with `__debug_mode__` set to false
- **THEN** Chat, Skills, and Workspace executable output SHALL contain no Replay state, profile-context lookup, synthetic seam, publication-drain identity, or rendered-acknowledgement branch
- **AND** Replay-exclusive modules SHALL contribute zero output bytes.

#### Scenario: Logical replay is inactive

- **WHEN** Replay Profiler is available but no logical run is active
- **THEN** business scheduling SHALL issue the same native timer calls and delays as before and SHALL invoke no logical port operation.

### Requirement: Replay publication acknowledgement is debug-exclusive

Replay SHALL publish target snapshots through a debug-exclusive sidecar and a narrow Workspace diagnostics port. The production Workspace core SHALL expose only an entirely elidable cold-path operation that obtains readiness, target child window, current revision, and forces publication for a specified tab; normal snapshot injection and child action handling SHALL contain no Replay acknowledgement state. The sidecar SHALL treat a missing message source as unverifiable rather than mismatched in Zotero privileged nested frames, and SHALL compare non-null publisher identities across direct and `wrappedJSObject` window representations before rejecting them as unrelated.

#### Scenario: Matching rendered publication completes

- **WHEN** the sidecar requests publication for a ready target tab and receives a message for that target snapshot with a newer revision
- **THEN** it SHALL wait until the target child's normal render listener has run and the next animation frame is reached before completing.

#### Scenario: Zotero omits the publisher source

- **WHEN** a target child in Zotero receives the matching newer snapshot but its `MessageEvent.source` is absent across the privileged nested-frame boundary
- **THEN** the sidecar SHALL accept the tab, revision, and captured child-window evidence and complete after render confirmation.

#### Scenario: Zotero exposes an equivalent wrapped publisher

- **WHEN** the observed publisher and expected shell window refer to the same browsing context through direct and `wrappedJSObject` representations
- **THEN** the sidecar SHALL treat them as the same publisher.

#### Scenario: Publication evidence does not match

- **WHEN** a message has a verifiably unrelated non-null publisher, wrong tab, stale revision, replaced frame window, or unrelated snapshot
- **THEN** the sidecar SHALL NOT acknowledge the publication.

#### Scenario: Publication wait terminates early

- **WHEN** timeout, abort, frame replacement, or child unload occurs before matching render confirmation
- **THEN** the sidecar SHALL reject with structured failure evidence and SHALL remove its listener and pending frame or timer work.

#### Scenario: Normal child rendering runs

- **WHEN** Chat, Skills, or SkillRunner child sidebars process ordinary snapshots
- **THEN** their render paths SHALL read no Replay drain property and SHALL send no Replay-specific child action.

### Requirement: Replay reports classify logical evidence

Logical replay JSON and Markdown SHALL record cadence, logical scheduler version, contamination, and timing comparability. Semantic disposition, persistence, change, publication, and payload evidence SHALL remain reportable, while wall time, throughput, scheduler lag, event-loop drift, and wall-clock-dependent request duration SHALL be labeled synthetic and non-comparable.

#### Scenario: Logical matrices are compared
- **WHEN** matrices have different cadence or logical scheduler version
- **THEN** they SHALL NOT be treated as comparable performance evidence.

### Requirement: Replay target activation is lifecycle-owned

Every Replay target SHALL expose an idempotent activation operation. For each matrix record the runner SHALL create the target, activate it only for `target-active`, prepare the Workspace surface, start profiling, replay trace and R2 work, drain publication, finish profiling, and clean up in that order. `closed` and `open-inactive` SHALL NOT activate the synthetic target.

#### Scenario: Chat target-active runs without a registered backend
- **WHEN** Replay prepares an already-created synthetic Chat owner while the real backend registry contains no matching backend
- **THEN** target activation SHALL succeed without backend lookup, adapter creation, transport creation, or default-backend persistence
- **AND** the ordinary ACP Chat backend and conversation selectors SHALL continue rejecting the missing backend even when it equals the lease-owned effective owner.

#### Scenario: Inactive surfaces run
- **WHEN** Replay profiles `closed` or `open-inactive`
- **THEN** target activation SHALL NOT run
- **AND** Workspace shell, tab, and readiness preparation SHALL remain independent from synthetic selection.

### Requirement: Synthetic Chat selection is restored safely

Chat Replay activation SHALL return an owner/token-scoped lease that snapshots the foreground selection. Cleanup SHALL restore that snapshot before deleting synthetic runtime, conversation, transcript, and index state, and SHALL be idempotent across completion, failure, cancellation, and repeated cleanup. A stale lease SHALL NOT overwrite a selection made after activation.

#### Scenario: Prior selection is restored
- **WHEN** the prior foreground selection is a real Chat owner, an empty owner, a closed Workspace state, or a Skills tab
- **THEN** Replay cleanup SHALL restore Chat selection and Workspace presentation state independently to their prior values.

#### Scenario: Cleanup lease is stale
- **WHEN** another owner supersedes the synthetic owner or a newer activation token exists before cleanup
- **THEN** the stale lease SHALL NOT replace the newer foreground selection.

#### Scenario: Workspace refreshes the real backend registry
- **WHEN** Workspace initialization refreshes or backend settings prune an empty or non-empty real backend registry while the synthetic lease still owns the exact foreground owner
- **THEN** registry maintenance SHALL update real backend data without deleting the synthetic runtime or clearing, switching, or persisting over the synthetic foreground
- **AND** owner readiness and Chat panel availability SHALL continue to project the lease-owned backend and conversation from in-memory runtime state without a registry entry.

#### Scenario: Activation or cleanup fails
- **WHEN** activation partially fails, Replay is canceled, or one cleanup operation throws
- **THEN** Replay SHALL attempt all remaining owned cleanup and restoration steps
- **AND** repeated cleanup SHALL NOT apply restoration twice.

### Requirement: Replay setup failure evidence is stage-accurate

Matrix v2 records SHALL optionally expose a structured primary `failure` containing `phase` and `detail`, where phase distinguishes target activation, Workspace preparation, profiling, replay, drain, and cleanup. The first error SHALL remain primary and later cleanup errors SHALL be retained as warnings. A stage not reached SHALL be reported as `not-run` rather than as a failure of that stage.

#### Scenario: Target activation fails
- **WHEN** target activation fails before Workspace preparation and profiling
- **THEN** the record failure phase SHALL identify target activation
- **AND** profiler, trace replay, R2, and drain SHALL remain not-run with no measurement family reported captured.

#### Scenario: Cleanup also fails
- **WHEN** a primary lifecycle failure is followed by cleanup failure
- **THEN** the primary failure SHALL remain unchanged
- **AND** cleanup failure detail SHALL appear in warnings.

### Requirement: R1 capture requires completed positive replay

R1 SHALL be captured only when semantic replay completes, the applied event count is greater than zero, and the observed semantic counter exactly matches that applied count. Equality between zero-valued defaults SHALL NOT produce captured evidence. R2 and R3 SHALL likewise remain missing or not-run when their producing stages do not execute, while backend-free transport metrics SHALL remain `not-applicable`.

#### Scenario: Setup fails before replay
- **WHEN** Replay setup fails while applied and semantic counters both remain zero
- **THEN** R1 SHALL NOT be captured
- **AND** R2 and R3 SHALL NOT be captured.

#### Scenario: Replay completes with semantic events
- **WHEN** replay completes with one or more applied events and the semantic counter matches exactly
- **THEN** R1 SHALL be captured.

### Requirement: Cold Workspace publication acknowledgement is retryable

After Workspace child and owner readiness, Replay diagnostics SHALL observe a post-baseline child snapshot revision and its render acknowledgement. If a forced asynchronous snapshot build completes without publishing because a concurrent cold-init build superseded it, diagnostics SHALL retry the same idempotent forced publication serially at a bounded interval. Retry SHALL stop after acknowledgement, cancellation, frame replacement, unload, publication error, or timeout, and SHALL NOT overlap forced builds.

#### Scenario: Cold first publication is superseded
- **WHEN** the first forced publication returns without a post-baseline revision because a newer child init build superseded it
- **THEN** diagnostics SHALL issue another forced publication without waiting for the overall timeout
- **AND** a later post-baseline revision rendered by the child SHALL complete Workspace preparation successfully.

### Requirement: Synthetic activation is release-elidable

The synthetic Chat activation/restore seam SHALL exist only when Debug and Replay Profiler source are enabled. Production plugin output and Replay-disabled diagnostic output SHALL contain zero bytes attributable to synthetic activation, lease state, or activation markers, and ordinary Chat hot paths SHALL perform no Replay-specific lookup or branch.

#### Scenario: Replay source is disabled
- **WHEN** runtime diagnostics build Replay Profiler as disabled or builds the production plugin entry
- **THEN** activation and lease markers SHALL be absent from executable output
- **AND** the production ACP Chat selector behavior SHALL remain unchanged.
