## Context

ACP Skills registers two adapter diagnostic listeners: one for new runs and one for recovered runs. Both currently append debug audit evidence and then call `upsertAcpSkillRun({ event })`. That canonical update rewrites the run row, appends a run-event row, advances `updatedAt`, and emits run/transcript changes even though adapter diagnostics do not drive transcript, recovery, permission, result, or lifecycle decisions.

ACP Chat already keeps a bounded in-memory diagnostic tail and publishes diagnostic-only snapshots with `persist: false`. However, later business saves serialize `diagnostics`, `stderrTail`, and `lastLifecycleEvent` into the conversation row, and restart hydration restores them. Those fields are used for current-process Details and Copy Diagnostics only; no recovery state machine reads them.

The release must preserve all canonical business data and existing low-volume ACP Skills audit artifacts. Detailed debug audit remains derived evidence and must never become a correctness source.

## Goals / Non-Goals

**Goals:**

- Make adapter diagnostics observational rather than canonical execution events.
- Keep ACP Chat diagnostic presentation owner-scoped and live while removing it from business conversation persistence.
- Route release `warn`/`error` evidence to existing bounded runtime logs and detailed debug evidence to buffered audit files.
- Bound audit-only pending memory and release audit keys without changing business-channel buffering.
- Prove through the production listener seam that diagnostic bursts cause zero business writes or business publications.

**Non-Goals:**

- Changing transcript, run, result, apply, permission, recovery, or conversation business schemas.
- Migrating or deleting historical rows or files.
- Reworking `runtimeLogManager`, Replay transport execution, Semantic Trace, or Assistant Workspace UI architecture.
- Making existing low-volume ACP Skills audit files debug-only.
- Adding a second queryable ACP Skills diagnostic store or a new user preference.

## Decisions

### Use one diagnostic routing policy with surface-specific audit sinks

`recordAcpRuntimeDiagnostic` will accept owner metadata, the adapter entry, and an optional debug audit sink. It will synchronously project a persistence-safe evidence DTO, update profiler/runtime-log evidence, enqueue debug audit, and return without waiting for disk. It will not import or call business stores or Workspace publication.

ACP Skills will keep its current `timeline.ndjson` format through `acpSkillRunAuditTrail`. ACP Chat will write debug evidence to `diagnostics.ndjson` inside the existing conversation storage directory. This preserves the established Skills audit contract while sharing severity and redaction policy.

### Preserve live Chat diagnostics but exclude them from durable conversation state

The existing 40-entry owner-scoped memory tail, Details projection, and Copy Diagnostics bundle remain unchanged. The conversation serializer will omit diagnostics, stderr tail, and diagnostic-derived lifecycle observation. The reader will tolerate but ignore legacy keys. This avoids a destructive migration and prevents disk evidence from becoming a restart source.

### Do not add a diagnostic ring for ACP Skills

ACP Skills has no recovery or control consumer for adapter diagnostics. Its live diagnostic source is the event stream; debug persistence uses the bounded pending audit queue. A separate ring would create another owner lifecycle and UI synchronization contract without preserving business behavior.

### Apply hard limits only to audit buffers

`enqueueBufferedWrite` will accept an optional drop-oldest hard limit. Audit keys use 2,048 entries and 2 MiB; transcript and every other business channel keep the existing unlimited pending/retry behavior. Overflow counters are observable and one warning is emitted per overflow episode. A successful drain ends the episode.

### Keep low-volume release audit artifacts

`run.json`, `prompt.md`, `stderr.log`, `runtime-logs.ndjson`, `final-state.json`, and related metadata remain available in normal mode. They are low-frequency user-observable troubleshooting artifacts and are not the R1 per-message amplification path.

### No historical cleanup

Old Skills diagnostic events remain readable. Old Chat rows remain physically untouched until a normal business save rewrites the payload without diagnostic fields. No schema migration, filtering pass, or file deletion is introduced.

## Risks / Trade-offs

- [Restarted Chat no longer displays historical diagnostics] → Preserve all business recovery fields and make current-process diagnostic semantics explicit in specs and tests.
- [Debug audit sink stalls or fails] → Enforce audit-only hard limits, best-effort flush/release, drop counters, and failure isolation from terminal state.
- [Runtime warn/error logging still uses the existing global persistence cadence] → Limit release routing to warn/error and do not broaden this change into a logger rewrite.
- [Removing Skills diagnostic events changes the contents of the Details runtime-event list] → Preserve business lifecycle events and move transport diagnostics to debug audit/runtime logs; no control or recovery logic reads those entries.
- [Historical records contain mixed diagnostic events] → Keep readers tolerant and avoid migration; only new writes follow the corrected boundary.

