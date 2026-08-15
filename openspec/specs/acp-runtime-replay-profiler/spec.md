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

#### Scenario: Formal matrix report is rendered

- **WHEN** a matrix contains warm-up and formal records for all three surfaces
- **THEN** the report summarizes the two formal records per surface
- **AND** it keeps warm-up evidence visible but excludes it from formal
  aggregation.

### Requirement: Replay injects versioned safe R2 work

Every profile window SHALL inject `ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1`: one single-frame health request, one 16-fragment health request with 5 ms fragment gaps, and eight concurrent two-fragment health requests through parser/input/no-op response seams only.

#### Scenario: R2 v1 completes
- **WHEN** a replay profile window runs
- **THEN** request, fragment, concurrency, and byte counts SHALL match the versioned workload
- **AND** no mutation dispatch SHALL be reachable.

### Requirement: Replay matrices preserve provenance and comparability

The runner SHALL write `zotero-agents.acp-runtime-replay-matrix.v2` JSON and a three-surface Markdown summary containing trace schema/digest, source kind, cadence, R2 version, replay configuration, plugin/Zotero environment, nine records, run roles, counts, bytes, scheduler lag, warnings, drain status, completion, and acceptance. Only complete formal runs with identical provenance SHALL be compared.

#### Scenario: Incompatible matrices are compared
- **WHEN** trace digest, source kind, cadence, R2 version, or replay configuration differs
- **THEN** the system SHALL reject governance comparison.

#### Scenario: R1 differs by surface
- **WHEN** a derived R1 metric changes across surfaces
- **THEN** the report SHALL retain the difference as a finding rather than force normalization.

### Requirement: Replay separates completion from acceptance

Replay completion SHALL describe execution and measurement availability only.
Acceptance SHALL separately evaluate publication lifecycle, bytes, forbidden
materialization, steady snapshots, target visibility, and drift.

#### Scenario: Execution finishes over the byte budget

- **WHEN** execution and measurement complete but posted bytes exceed budget
- **THEN** completion remains complete
- **AND** acceptance fails with the byte-budget reason.

### Requirement: Replay uses current v1 lifecycle vocabulary

Replay SHALL use exact v1 source, kind, form, cause, delivery, rebase, and
overflow semantics. Historical matrix compatibility and governance eligibility
fields SHALL NOT remain in current-state results.

#### Scenario: A target-active run drains

- **WHEN** Replay reaches its source/publication/delivery barrier
- **THEN** every earlier matching publication has a terminal ledger result
- **AND** unknown gaps make measurement incomplete rather than silently passing.

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

After Workspace child and owner readiness, Replay diagnostics SHALL force an
exact publication barrier and observe its render acknowledgement. If an
asynchronous build produces no publication or a concurrent cold-init build
supersedes the forced identity, diagnostics SHALL retry the same idempotent
request serially at a bounded interval. Retry SHALL stop after acknowledgement,
cancellation, frame replacement, unload, publication error, or timeout, and
SHALL NOT overlap forced builds.

#### Scenario: Cold first publication is superseded
- **WHEN** the first forced request produces no identity or its identity is
  superseded by a newer child init publication
- **THEN** diagnostics SHALL issue another forced publication without waiting for the overall timeout
- **AND** a later exact forced identity rendered by the child SHALL complete
  Workspace preparation successfully.

### Requirement: Synthetic activation is release-elidable

The synthetic Chat activation/restore seam SHALL exist only when Debug and Replay Profiler source are enabled. Production plugin output and Replay-disabled diagnostic output SHALL contain zero bytes attributable to synthetic activation, lease state, or activation markers, and ordinary Chat hot paths SHALL perform no Replay-specific lookup or branch.

#### Scenario: Replay source is disabled
- **WHEN** runtime diagnostics build Replay Profiler as disabled or builds the production plugin entry
- **THEN** activation and lease markers SHALL be absent from executable output
- **AND** the production ACP Chat selector behavior SHALL remain unchanged.

### Requirement: Replay requires complete region publication evidence

Replay SHALL mark R3 captured only when all required host prepare/post, shell-forward, child-apply, and render-ack metric families are present and attributable for successfully posted publications. Missing stages SHALL keep execution evidence intact but mark measurement incomplete with a structured reason.

#### Scenario: Render acknowledgement is missing

- **WHEN** a replay publication is posted but no matching child render acknowledgement is captured
- **THEN** replay execution MAY remain complete
- **AND** R3 measurement SHALL be incomplete with the missing lifecycle stage identified.

#### Scenario: Replay drain waits for the exact publication

- **WHEN** the child receives a forced diagnostic publication before its render acknowledgement reaches the host
- **THEN** replay drain SHALL remain pending
- **AND** it SHALL complete only after that publication ID has render-complete evidence and earlier same-tab publications have reached a terminal state.

#### Scenario: Owner-first activation temporarily rejects the probe

- **WHEN** the host owner is ready but the child still rejects the forced publication as old-owner, or a newer generation supersedes it
- **THEN** replay drain SHALL treat that result as a terminal state for the rejected identity
- **AND** it SHALL retry the idempotent diagnostic publication without overlapping force builds.

#### Scenario: A prior run acknowledgement arrives late

- **WHEN** an acknowledgement from prepare or a previous replay round arrives during the current profile
- **THEN** it SHALL NOT satisfy the current round's publication lifecycle
- **AND** equal aggregate counts with mismatched publication identities SHALL keep R3 measurement incomplete.

#### Scenario: Closed surface replays

- **WHEN** the Workspace surface is closed
- **THEN** replay SHALL require no R3 publication lifecycle and SHALL report expected-zero R3.

### Requirement: Replay attributes inactive and matching region work

Replay SHALL distinguish matching-target, opposite-active, and inactive-source causality. Open-inactive replay SHALL NOT build target or opposite-tab publications from trace-source changes; it MAY record dropped-before-build. Target-active replay SHALL attribute region publication and acknowledgement only to the mapped current owner.

#### Scenario: Open-inactive Chat trace replays

- **WHEN** a Chat trace runs while another Workspace tab is active
- **THEN** Chat region DTO prepare and post SHALL remain zero
- **AND** any source-change evidence SHALL be recorded as dropped-before-build rather than hidden.

#### Scenario: Target-active Chat trace replays

- **WHEN** a live Chat trace runs on its matching active owner
- **THEN** every successful post SHALL have matching shell-forward, child-apply, and render-ack evidence.

### Requirement: Replay reports region governance comparison

Replay reports SHALL compare corrected before and after live Chat R3 counts and actual posted bytes under identical provenance. Formal target-active baseline publications SHALL be fewer than the corrected pre-governance total, actual posted bytes SHALL decrease, and the greater-than-100-millisecond drift bucket SHALL not worsen in real-host recorded-cadence runs.

#### Scenario: Logical cadence report is generated

- **WHEN** the comparison uses logical cadence
- **THEN** the report SHALL compare stable lifecycle counts and bytes
- **AND** it SHALL NOT interpret wall time as actual Zotero responsiveness.

#### Scenario: Real-host formal evidence is generated

- **WHEN** matching recorded-cadence live Chat formal runs complete on Zotero 7 or Zotero 9
- **THEN** the report SHALL compare R3 lifecycle counts, actual posted bytes, and drift buckets using identical provenance.

### Requirement: Replay drain uses an exact publication barrier

Diagnostic force SHALL always return a publication identity even when content is unchanged. Replay SHALL wait for that identity and work queued before its barrier on the same surface, and SHALL NOT require unrelated historical pending publications to disappear.

#### Scenario: Forced equal-content snapshot

- **WHEN** Replay forces publication without a content change
- **THEN** Host posts a diagnostic snapshot with a new publicationId
- **AND** sidecar completes from that exact render-complete identity.

### Requirement: Replay profile evidence is publication-epoch scoped

Before each profile window Replay SHALL drain both ACP publication lanes,
capture the active child generation and per-source delivery watermark, and
attribute current-run lifecycle evidence after that watermark.

#### Scenario: A prior Chat publication precedes Skills open-inactive

- **WHEN** the prior publication terminates before the Skills profile starts
- **THEN** it does not contaminate the Skills record
- **AND** a prior publication arriving after profile start makes measurement
  incomplete.

### Requirement: Replay verifies the complete v1 lifecycle

Each successful publication SHALL correlate the same publicationId across post, shell-forward, child-apply, and render-complete. Old-owner, stale, gap, superseded, or invalid publications SHALL not modify DOM.

#### Scenario: Valid transcript delta replays

- **WHEN** child accepts and renders it
- **THEN** all successful lifecycle stages report the same publicationId and terminal outcome.

### Requirement: Formal acceptance is atomic across surfaces

Formal boundary runs SHALL require Chat and Skills transcript visibility, complete execution and measurement, zero forbidden steady materialization, Chat bytes below 2.7 MB, Skills bytes no greater than 557610, and no greater-than-100ms drift regression on available Zotero 7/9 hosts.

#### Scenario: One surface fails

- **WHEN** either Chat or Skills has missing transcript, timeout, incomplete measurement, forbidden materialization, or budget regression
- **THEN** the entire change remains incomplete.

### Requirement: Target-active drain is bounded by an exact delivery barrier

An ACP target force operation SHALL return a barrier containing source, tab, publication identity, and delivery sequence. Replay SHALL wait for every same-source, same-tab publication with delivery sequence at or below the barrier to reach terminal acknowledgement, and SHALL exclude later or unrelated publication work.

#### Scenario: Preparation and forced publications overlap

- **WHEN** target preparation publications are still in flight when the forced target publication is issued
- **THEN** drain waits for all matching publications through the returned delivery sequence
- **AND** it does not return merely because the forced identity finishes first.

### Requirement: Replay readiness requires visible target transcript

For ACP Chat and ACP Skills target-active runs, readiness and final drain SHALL require successful render acknowledgement for the selected owner and a ready transcript region in the current child generation. SkillRunner SHALL use its own readiness result and SHALL NOT require an ACP publication identity.

#### Scenario: Child accepts model but rendering fails

- **WHEN** target transcript model apply succeeds but the DOM render fails
- **THEN** target-active measurement is incomplete with a structured render failure
- **AND** replay does not report successful publication completion.

### Requirement: Replay provenance stem and phase are one value

Replay SHALL derive the internal normalized stage and result filename stage slug from the same frozen replay configuration. Persistence and comparison SHALL reject an artifact whose internal stage does not match the generated artifact stem metadata.

#### Scenario: Persisted phase and artifact stem diverge

- **WHEN** a replay result is about to be accepted with inconsistent phase provenance
- **THEN** the result is rejected as provenance-incomplete
- **AND** it is not eligible for governance comparison.

### Requirement: R3 completeness is scoped to profile-owned publication identities

Replay R3 completeness SHALL use publications whose post stage was recorded inside the active profile as its identity set. A later stage for a publication posted outside that profile SHALL be classified out-of-window and SHALL NOT alter current lifecycle totals or completeness.

#### Scenario: Initialization acknowledgement arrives after profile start

- **GIVEN** an initialization publication was posted before the replay profile began
- **WHEN** its shell, child or render acknowledgement arrives during the profile
- **THEN** the acknowledgement does not increase current R3 stage totals
- **AND** all current profile-owned identities can still produce a complete measurement.

#### Scenario: Current publication misses render acknowledgement

- **WHEN** a publication posted inside the active profile lacks its terminal render acknowledgement
- **THEN** R3 measurement remains incomplete.

### Requirement: Formal Replay rejects renderer recovery and rebase storms

Target-active formal ACP Chat and ACP Skills boundary Replay SHALL require
visible target transcript, complete execution and measurement, accepted render
terminals, complete publication identities, zero forbidden steady
materialization, and no automatic rebase or recovery-full path for valid trace
publications.

#### Scenario: Either target-active surface rebases valid deltas

- **WHEN** a valid steady trace produces a gap, automatic rebase page read, or rebase snapshot
- **THEN** the affected record and atomic cross-surface acceptance are incomplete.

#### Scenario: Skills delta failure triggers repeated rebase snapshots

- **WHEN** lifecycle evidence contains render rejection, recovery-full, or
  automatic rebase
- **THEN** formal acceptance fails with the structured reason
- **AND** posted rebase bytes remain visible in the report.

### Requirement: Rebase drain follows the coordinator barrier

Replay diagnostic publication drain SHALL wait for the exact coordinator-owned publication barrier. Child automatic page requests and removed control-publication identities SHALL NOT participate in the barrier.

#### Scenario: A diagnostic equal-content snapshot is forced

- **WHEN** Replay forces an owner snapshot after all prior same-surface work
- **THEN** it receives and waits for the exact snapshot publication identity
- **AND** unrelated historical or removed rebase-control state cannot block completion.

### Requirement: ACP Chat replay targets SHALL use the connection adapter seam

ACP Chat replay targets SHALL activate through the normal ACP Chat connection
path using a synthetic `AcpConnectionAdapter`. Replay events SHALL be emitted
through adapter update, permission, and diagnostic listeners instead of
session-manager replay entry points.

#### Scenario: Replay session identity matches the connected session

- **WHEN** a replay target activates a synthetic backend
- **THEN** the synthetic adapter SHALL create the deterministic replay session
  id
- **AND** owner-mapped session updates SHALL match that session id

#### Scenario: Replay permission events use the standard permission path

- **WHEN** a replay trace contains permission-request and permission-outcome
- **THEN** the adapter SHALL emit the request through the permission listener
- **AND** the replay target SHALL resolve it through the standard host
  permission path with the recorded outcome

#### Scenario: Replay diagnostics use the standard diagnostic path

- **WHEN** a replay trace contains diagnostic events
- **THEN** the adapter SHALL emit them through the diagnostics listener
- **AND** session manager SHALL append them through normal diagnostic handling

#### Scenario: Replay timer inspection is owned by the synthetic adapter and session timer seam

- **WHEN** logical-time replay inspects replay-owned timers
- **THEN** synthetic adapter inspection SHALL come from the adapter module
- **AND** session runtime timer inspection SHALL use the generic session timer
  seam
- **AND** session manager SHALL NOT expose a replay-specific timer inspector
