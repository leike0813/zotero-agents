# acp-runtime-performance-profiler Specification

## Purpose
TBD - created by syncing change profile-acp-runtime-hot-paths. Update Purpose after archive.
## Requirements
### Requirement: ACP runtime profiling is debug-only and source-enabled

ACP runtime profiling SHALL be available only when debug mode and its independent hard-coded profiler source switch are enabled. It SHALL activate only for replay profile windows or deterministic mechanism fixtures and SHALL remain disabled during semantic trace capture. Non-debug production bundles and profiler-switch-disabled debug bundles SHALL eliminate profiler modules, imports, metric markers, profile-context computation, map lookups, synthetic publication attribution, and hot-path branches.

#### Scenario: Non-debug bundle is profiler-free

- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** the profiler module and Replay-only production ports SHALL contribute zero output bytes
- **AND** the output SHALL contain no profiler schema, metric, profile-context, synthetic-helper, or publication-attribution marker.

#### Scenario: Source-disabled debug bundle is profiler-free

- **WHEN** the plugin entry is bundled in debug mode with the profiler source switch set to false
- **THEN** profiler recorder and replay profiling adapters SHALL contribute no runtime state, context lookup, timer, persistence, publication acknowledgement, or hot-path work.

#### Scenario: Trace capture excludes profiling

- **WHEN** the semantic trace recorder is armed, recording, or frozen
- **THEN** no replay profile SHALL be active and no profiler aggregate SHALL be allocated for captured work.

#### Scenario: Test activation respects debug mode

- **WHEN** a test requests profiling without enabling the debug-mode test override
- **THEN** activation SHALL fail and all profiler APIs SHALL remain inert.

### Requirement: ACP runtime profiles are bounded aggregates

The profiler SHALL accept only fixed metric names and low-cardinality label values. It SHALL store counters, gauges, and fixed-bucket duration aggregates without retaining raw samples, user text, paths, commands, backend identifiers, provider identifiers, or workflow identifiers as metric keys.

#### Scenario: Burst remains bounded

- **WHEN** a debug fixture records 10,000 runtime events
- **THEN** active profiles, completed profiles, metric series, histogram buckets, and retained sample count SHALL remain within fixed bounds
- **AND** retained raw sample count SHALL remain zero.

#### Scenario: Recorder failure is isolated

- **WHEN** an injected profiler clock or scheduler fails
- **THEN** the ACP, Host Bridge, persistence, or UI operation SHALL preserve its original return value and failure behavior.

### Requirement: Runtime work is attributed without guessing

Request-scoped ACP work SHALL be attributed to its durable request id. Host Bridge work SHALL use the existing ACP scope header after parsing. Missing, invalid, or non-ACP scope and shared event-loop drift SHALL be recorded once in a bounded global aggregate.

#### Scenario: Scoped Host Bridge request

- **WHEN** a Host Bridge request carries an ACP Skill run scope with request id `A`
- **THEN** its reader and handler metrics SHALL be attributed to profile `A`.

#### Scenario: Unscoped work remains global

- **WHEN** runtime work has no valid ACP request scope
- **THEN** it SHALL be recorded only in the global aggregate
- **AND** it SHALL NOT be copied to or guessed from active request profiles.

### Requirement: Profiling lifecycle follows replay target lifecycle

Chat and ACP Skills replay targets SHALL expose symmetric profile prepare, start, R3 signature/post attribution, drain, and finish lifecycle. A profile SHALL begin only after synthetic ownership and surface preparation drain and SHALL finish exactly once before cleanup.

#### Scenario: Chat target is active

- **WHEN** a Chat trace profile window publishes Workspace work
- **THEN** R3 prepare, signature, and post metrics SHALL be attributed to the Chat synthetic conversation and selected surface.

#### Scenario: Skills target is active

- **WHEN** a Workflow trace profile window publishes Workspace work
- **THEN** the same R3 lifecycle metrics SHALL be attributed to the synthetic workflow/request owners and selected surface.

#### Scenario: Closed surface runs

- **WHEN** a replay profile executes with Workspace closed
- **THEN** it SHALL produce no R3 metrics.

### Requirement: Automated fixtures establish the mechanism baseline

The repository SHALL provide deterministic automated fixtures for R1 JSON-RPC and persistence work, R2 Host Bridge input, R3 Assistant Workspace publication, event-loop drift, queues, accumulators, and buffered writes. CI SHALL assert counts, bytes, attribution, bounds, and data-flow invariants rather than machine-specific elapsed-time thresholds.

#### Scenario: Silent execution baseline is repeatable

- **WHEN** the automated silent execution fixture runs with the same fixed inputs
- **THEN** it SHALL produce the same counter, byte, attribution, and capacity results without requiring a real Zotero installation.

#### Scenario: Real-host timing is optional

- **WHEN** no Zotero 7 or Zotero 9 timing artifact is available
- **THEN** the automated mechanism baseline SHALL still satisfy this change's completion gate
- **AND** no claim about real-host latency or performance improvement SHALL be made.

### Requirement: Measurement coverage identifies synthetic timing

Profiler coverage SHALL distinguish captured semantic/runtime evidence from timing evidence produced under a logical clock. Logical replay SHALL retain measured values for diagnostics but SHALL mark wall-clock-dependent timing families synthetic and non-comparable without downgrading correctly captured semantic counters.

#### Scenario: Logical replay completes without contamination
- **WHEN** logical replay processes every event and captures all replay-owned timers
- **THEN** execution and semantic measurement SHALL be complete
- **AND** wall-clock-dependent timing SHALL be reported as synthetic rather than as recorded-equivalent evidence.

#### Scenario: Logical timer ownership is contaminated
- **WHEN** Replay cannot prove exclusive ownership of a timer
- **THEN** execution MAY remain complete, measurement SHALL be incomplete, and the structured contamination reason SHALL appear in JSON and Markdown.

### Requirement: R3 profiler measures the region publication lifecycle

The R3 profiler SHALL separately record requested, dropped-before-build, prepare, signature-skip, post, shell-forward, child-apply, and render-ack stages for baseline and each typed region publication. Every record SHALL identify publication kind, owner class, initialization versus steady state, and matching-target, opposite-active, or inactive-source causality.

#### Scenario: Inactive source is rejected early

- **WHEN** a profiled source change cannot target the current Workspace owner
- **THEN** R3 SHALL record dropped-before-build with inactive-source or owner-mismatch causality
- **AND** prepare, signature, post, shell-forward, child-apply, and render-ack SHALL remain zero for that request.

#### Scenario: Region publication renders

- **WHEN** a matching current-owner region publication completes
- **THEN** its prepare, post, shell-forward, child-apply, and render-ack records SHALL share attributable publication identity.

#### Scenario: Publication identities are recorded without high-cardinality metric series

- **WHEN** multiple publications of the same kind complete during one profile
- **THEN** their lifecycle identities SHALL be retained in a bounded identity sidecar
- **AND** ordinary metric series SHALL remain aggregated by stable publication labels rather than publication ID.

### Requirement: R3 profiler reports actual bytes and durations

The profiler SHALL compute signature input bytes from the actual bounded region DTO and posted bytes from the actual publication envelope. It SHALL NOT stringify a profiler-only full snapshot. Duration summaries SHALL report count, total milliseconds, and maximum milliseconds as distinct values.

#### Scenario: Signature input differs from posted envelope

- **WHEN** a region DTO is signed and its envelope is posted
- **THEN** the profiler SHALL retain separate signature input and actual posted byte totals
- **AND** neither value SHALL be labeled as the other.

#### Scenario: Duration family is aggregated

- **WHEN** multiple lifecycle operations are measured
- **THEN** the report SHALL expose operation count, total duration, and maximum duration separately.

### Requirement: Corrected R3 baseline is causally comparable

Corrected pre-governance and post-governance evidence SHALL use the same live trace, display mode, cadence, source target, and provenance. Logical cadence MAY compare deterministic counts and bytes but SHALL NOT support a claim about real-host latency.

#### Scenario: Governance evidence is compared

- **WHEN** before and after R3 matrices are compared
- **THEN** their trace digest, live display mode, cadence, target, and relevant provenance SHALL match
- **AND** the report SHALL distinguish deterministic mechanism evidence from real-host timing evidence.

### Requirement: Profiler vocabulary matches v1 publication semantics

Publication lifecycle events SHALL use bounded labels derived from the v1 owner
source, publication kind, wire form, and exact cause. Materialization events
SHALL add a materialization source only at the actual read-model or transcript
page builder entry. Profiler SHALL NOT infer wire form or materialization source
from publication kind, payload shape, or surface-specific DTO fields.

#### Scenario: Skills transcript delta posts

- **WHEN** Skills posts a steady transcript delta
- **THEN** profiler records source acp-skills, kind transcript, form delta, and cause steady-state
- **AND** the publication lifecycle does not invent a materialization source.

### Requirement: Forbidden materialization is measured at builder entry

Profiler SHALL count region, transcript-page, frontend-snapshot, and
panel-snapshot materialization at their actual builder entry points so steady
transcript/count/progress acceptance can require zero forbidden
materialization.

#### Scenario: A forbidden builder is called

- **WHEN** a steady publication invokes it before the coordinator
- **THEN** the formal report records the violation even if the final wire payload is a delta.

### Requirement: Publication lifecycle identity is owned by in-window post

Only an in-window post SHALL create a publication lifecycle record. The record
SHALL retain source, kind, wire form, exact cause, delivery sequence, bounded ACK
outcomes, and a first-write-wins terminal result.
The lifecycle ledger SHALL have an independent declared capacity large enough
for formal trace windows. If that capacity is exceeded, the profile SHALL
increment `publicationLifecycleDrops` and mark measurement incomplete.

#### Scenario: A rejected render ACK arrives

- **WHEN** an in-window publication receives a render-failed rejection
- **THEN** the ledger records that terminal result
- **AND** a later ACK cannot replace it with accepted or missing-ACK status.

#### Scenario: Preparation publication acknowledges after profile start

- **WHEN** a publication posted before profile start emits child or render acknowledgement during the profile
- **THEN** the acknowledgement is recorded as out-of-window
- **AND** no zero-post lifecycle is added to the profile identity set.

#### Scenario: A formal trace posts more than 512 publications

- **WHEN** more than 512 publications are posted inside one profile window
- **THEN** their lifecycle identities remain available up to the declared
  independent lifecycle limit
- **AND** the metric-series cap does not truncate the lifecycle ledger.

### Requirement: Publication lifecycle retains bounded renderer diagnostics

In-window publication lifecycle records SHALL retain each ACK outcome, bounded
failure stage/code, render path, and first-write-wins terminal result.

#### Scenario: Child rejects a transcript render

- **WHEN** a render-failed ACK includes a bounded failure descriptor
- **THEN** the completed profile preserves that descriptor
- **AND** Replay does not reduce it to a generic missing ACK.

### Requirement: Publication labels come from canonical lifecycle metadata

Profiler surface, kind, form, cause, and delivery labels SHALL be derived from coordinator lifecycle metadata associated with `publicationId`. No surface SHALL use another surface's default label builder.

#### Scenario: Skills transcript acknowledges

- **WHEN** an ACP Skills transcript delta reaches child and render completion
- **THEN** both acknowledgement metrics identify `acp-skills`, `transcript`, and `delta`
- **AND** no `acp-chat` surface label is emitted for that lifecycle.

### Requirement: Render duration ends at accepted DOM completion

The profiler SHALL measure host-observed publication duration from post to accepted render completion. Rejected, failed, unknown, or out-of-window acknowledgements SHALL NOT contribute to the accepted render duration family.

#### Scenario: Renderer reports failure

- **WHEN** a posted publication terminates with `render-failed`
- **THEN** it remains attributable as a failed lifecycle
- **AND** it is excluded from accepted render duration.

### Requirement: Profiler records actual execution display mode

ACP replay profiles SHALL record the execution display mode active when the profile begins. Production replay ports SHALL NOT substitute a constant display mode.

#### Scenario: Boundary replay begins

- **WHEN** the user preference is boundary at profile start
- **THEN** the profile and generated report identify the display mode as boundary.

### Requirement: Profiler records bounded transcript render work

When profiling is enabled, the shared child renderer SHALL report the render path and inserted, updated, removed and measured row counts for each publication identity. Render observation SHALL be diagnostic and SHALL NOT add fields to the publication acknowledgement envelope.

#### Scenario: Structural delta inserts one visible row

- **WHEN** a steady delta inserts one row without changing other rows
- **THEN** the profiler records an incremental render with bounded row work
- **AND** full-render count remains zero.

### Requirement: Profiler distinguishes steady continuity from rebase

The ACP runtime profiler SHALL record surface, kind, form, cause, materialization source, gap rejection, rebase page read, and rebase snapshot with low-cardinality canonical labels. Removed wire forms SHALL NOT remain as current-state labels.

#### Scenario: Valid steady delta renders

- **WHEN** either ACP surface accepts and renders a transcript delta
- **THEN** its identity contains matching post, Shell forward, child apply, and render-complete stages
- **AND** it contributes no gap, rebase, snapshot, panel, or frontend materialization.

### Requirement: Projected count diagnostics share one meaning

Profiler transcript metadata SHALL report `totalVisibleItemCount` and SHALL NOT interpret raw Chat or Skills store counts as selected-page continuity.

#### Scenario: Hidden source events advance

- **WHEN** source event sequence advances without a visible transcript mutation
- **THEN** profiler may record source work but does not report a visible-count or transcript-revision advance.

### Requirement: Correctness evidence is independent of metric series caps

Lifecycle records and correctness counters SHALL remain complete after metric
series reach their cap. Any series drop SHALL be reported at profile top level
and mark measurement incomplete.

#### Scenario: More than 128 metric label combinations occur

- **WHEN** the profiler drops additional metric series
- **THEN** publication lifecycle evidence remains queryable
- **AND** the profile reports structured incompleteness.

### Requirement: Host input profiling describes asynchronous reader work

The debug-only ACP runtime profiler SHALL retain `host_input_bytes`, `host_input_fragment`, `host_input_duration`, and `host_request_inflight`, and SHALL record `host_input_wait` plus `host_input_callback_max_duration` for successful and failed event-driven reads. Release-build profiler elision SHALL remain unchanged.

#### Scenario: Fragmented host request is profiled

- **WHEN** a profiled Host Bridge or MCP request requires multiple asynchronous readiness registrations
- **THEN** `host_input_wait` SHALL record those registrations
- **AND** `host_input_callback_max_duration` SHALL record the maximum synchronous duration of one readiness callback.

#### Scenario: Host request fails before completion

- **WHEN** a profiled request times out, aborts, reaches EOF, or encounters a read error
- **THEN** the profiler SHALL retain the bounded input statistics observed before failure.

#### Scenario: Historical baseline is read

- **WHEN** a baseline contains the legacy `host_input_unavailable` metric
- **THEN** reporting SHALL remain able to read that baseline
- **AND** the event-driven reader SHALL NOT emit new `host_input_unavailable` samples.
