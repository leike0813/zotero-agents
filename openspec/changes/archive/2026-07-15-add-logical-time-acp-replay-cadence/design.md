## Context

Recorded replay sleeps for every positive `monotonicOffsetMs` gap. The current trace spans about forty-one minutes, so three surfaces with one warm-up and two formal runs require more than six hours. Burst avoids the waits but changes the grouping of live publication, persistence, and Workspace snapshot timers. Those timers currently use direct native `setTimeout` calls and must remain unchanged outside an active logical replay.

## Goals / Non-Goals

**Goals:**

- Preserve replay-owned 16 ms, 160 ms, and 2000 ms timer deadline ordering without real trace-gap waits.
- Keep disabled and inactive production timer hot paths free of new branches, lookups, calls, allocations, and initialization.
- Detect background or non-synthetic timer contamination instead of silently taking ownership.
- Retain real database writes, publication work, cancellation, drain, cleanup, and matrix attribution.

**Non-Goals:**

- Reproducing recorded wall time, throughput, scheduler lag, event-loop drift, or backend transport performance.
- Patching global timers or `Date`, changing semantic trace storage, adding a speed multiplier, or adding backend-specific behavior.

## Decisions

### Logical time is a replay-only run scope

`logical` creates an `AcpRuntimeReplayLogicalTimePort` only inside one matrix run. Before each event it advances to the event offset and executes all deadlines at or before that offset. It then applies the event and captures newly scheduled replay-owned timers. Equal deadlines use registration order, and callbacks that schedule immediately due work run in a later callback batch after a real macrotask yield.

### Production timer scheduling remains native

The five existing Chat, Skills, and Workspace timer scheduling paths continue to call native `setTimeout` directly. Business modules expose synthetic replay control functions for inspecting, detaching, firing, resuming, and flushing pending timers. Those exports are referenced only from replay diagnostic modules and are removed when Debug or the Replay Profiler source is disabled. No timer hot path reads replay profile context or a scheduler pointer.

### Ownership is explicit and contamination fails closed

Chat timers are scoped by backend and conversation, Skills soft persistence by synthetic request owner, and Workspace publication by the prepared target host. The global Skills change timer is eligible only when all pending request ids belong to the current run. Existing pending work, host changes, mixed owners, a native timer firing before capture, or an invalid token produces structured contamination and incomplete measurement; real background work is never detached.

### Tail timers return to native scheduling

After the final trace event, deadlines at or before the final offset run logically. Later timers are resumed through native `setTimeout` using their remaining delay and stable registration order. Capture then closes before the existing target drain, Workspace drain, profiler finish, and target cleanup sequence. Disposal removes logical bookkeeping but never cancels resumed native work. Drain failures attempt a write-bearing fallback flush and retain incomplete evidence rather than silently dropping persistence.

### Logical timing evidence is explicitly synthetic

Event disposition, projection, change, persistence, publication counts, and payload sizes remain valid evidence. Wall time, throughput, scheduler lag, event-loop drift, and wall-clock-dependent request duration remain numeric diagnostics but are marked synthetic and non-comparable. Matrix v2 remains the format; replay config records logical scheduler version 1 and comparability includes cadence plus scheduler version.

## Risks / Trade-offs

- [A native timer fires before capture] -> Capture after every awaited synthetic apply, detect token loss, fail the measurement closed, and retain native behavior.
- [Global Skills or Workspace timers contain background work] -> Require a clean baseline and explicit owner/host checks before detaching.
- [Tail writes are lost] -> Resume future timers natively before drain and run write-bearing fallback flush on drain failure.
- [Logical results are mistaken for performance baselines] -> Mark timing families synthetic in JSON, Markdown, and comparability checks.
- [Inactive runtime pays for diagnostics] -> Preserve direct timer calls and enforce release elision plus inactive-spy tests.

## Migration Plan

Existing traces and replay matrices remain valid. The default cadence remains `recorded`. Existing `recorded` and `burst` execution paths do not construct logical-time ports. Unknown cadence values are rejected instead of silently normalizing to recorded.

## Open Questions

None.
