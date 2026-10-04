---
status: accepted
date: 2026-08-28
decision-ticket: https://github.com/leike0813/zotero-agents/issues/25
implemented-by: https://github.com/leike0813/zotero-agents/issues/26
---

# Keep Pi observability as projections over owned facts

The Built-in Pi Agent Runtime publishes observability through three narrow Interfaces: durable semantic facts in the Pi Agent Transcript, compact owner projections in owner records, and bounded diagnostic evidence in Runtime Audit Tiers. It has no overall progress contract and no universal observability event; each Interface shares stable identity semantics without sharing one extensible payload.

Usage and cost reuse Pi's existing `Usage` semantics and calculation. Each Pi Model Invocation is recorded independently, while turn and owner totals remain rebuildable projections; a small outer accounting state distinguishes complete, partial, unknown and inapplicable observations without reimplementing Pi's token or cost logic.

ChatGPT subscription calls retain the fields actually reported by Responses, including partial usage on incomplete or failed requests. Missing fields remain unknown, and API-key prices do not apply to subscription calls. Each physical retry has its own canonical invocation identity; only the actual `response.completed` event can establish successful completion. Visible partial assistant text remains incomplete and is excluded from normal model context.

Failures use a project-owned structured core with stable category, origin, code, retryability and effect certainty. Process-specific phases remain in the modules that own those processes, a failure does not decide an owner terminal outcome, and user-visible recovery actions are computed from durable owner state rather than inferred by the UI.

Runtime audit evidence never duplicates prompts, literature content, tool payload bodies, credentials or absolute user paths. Audit remains bounded and best-effort, reports evidence gaps, and supports on-demand diagnostic export through references to canonical facts.

## Failure core

One observed failure gets one `PiFailureCore` (`src/shared/piFailureContract.ts`): a `failureId`, an `origin`, a `code`, a `category`, a `retryable` flag and an optional `effectCertainty`. The owning module commits it to its own canonical transcript; every higher projection — turn, owner, audit, export — references the same `failureId` rather than re-classifying or re-describing the cause. A core carries no message, stack, exception cause, credential or free-form detail, so a failure propagated upward can never smuggle private content into a new surface.

Classification and severity come from one `POLICY` table. A code that table has not seen is a gap in the table, not a benign event: it resolves to `error` severity, `execution` category, non-retryable, and never degrades to info. Effect certainty describes what already happened (`not_started`, `not_applicable`, `settled`, `unknown`) and is independent of the cause, so `tool_effect_unknown` and `recovery_required` stay effect/recovery states rather than failure causes.

`failure_observed` is a non-context transcript fact: it is recorded durably and referenced, but is excluded from the model context rebuilt by turn preparation.

## Runtime audit contract

`piRuntimeAudit` (`src/modules/piRuntimeAudit.ts`) is the single audit sink. Producers call `record(fact)` and never choose severity, level or free-form fields.

- **One owner, one sink.** A fact carrying a `PiOwnerRef` is written to that owner's managed workspace at `<workspace>/runtime-audit/audit.ndjson`. A fact without one goes to the existing Runtime Log retention. A fact is recorded once, by the seam that owns it, after the corresponding canonical commit; propagation layers and UI never re-record it.
- **Workspace resolution.** A Conversation's audit root is `<ownerDir>/workspace`. A Skill Run's audit root is resolved only from its canonical `skill_run_workspace` / `skill_run_prepared` entry, so a workspace can never be adopted from a caller-supplied string.
- **Tiers are policy, not caller choice.** A single operation table decides tier, severity, permitted origins and permitted attributes. Production admits the ten structural operations; Diagnostic Mode admits the additional execution/interaction/transport/policy/projection boundaries; Debug requires the Debug build _and_ the independent `PI_RUNTIME_AUDIT_DEBUG_ENABLED` switch. Admission is evaluated at call time.
- **Projection is an allowlist.** Only the operation's declared attributes survive, and only as bounded numbers, booleans or opaque tokens. A `failureCode` contributes severity only — the canonical failure is never copied into audit. Prose, transport bodies, credentials, absolute paths and URL queries have no path into a record.

Storage and queue bounds are fixed module constants, overridable only through the test-only reset: 64 MiB / 50,000 records / 64 KiB per record per owner, 1 MiB or 1,000 records pending, 96 MiB uncompressed per export. Reaching a store cap compacts atomically to 75% of both targets — merge adjacent structural repeats, drop oldest debug then info, reduce old warn/error repeats keeping the newest representative, then drop the oldest remainder — and records a gap. Overflow, oversized entries and write failures accumulate bounded gap counters and never fail the owner. `record` cannot throw into execution.

Audit participates in the existing Native owner quota serialization: it appends under the same quota lock and can be reclaimed through a private callback that compacts audit only, never canonical or business data. Missing quota evidence fails audit admission with a gap.

## Diagnostic export

`exportDiagnostics(scope, targetPath)` writes one ZIP to the path the user picked, atomically, via the existing Workflow archive writer. Owner scope contains that owner's audit plus related global logs filtered by correlation identity and the owner's time window. Global scope contains ownerless global facts and logs only and reads no owner directory. There is no automatic upload and no all-owner export.

An active-owner export takes a fixed queue barrier and Runtime Log snapshot, then composes from a temporary copy, so records arriving after the barrier stay in normal storage but out of the export, and owner execution is not held. The ZIP holds `manifest.json`, `runtime-diagnostics.json` and, for owner scope, `owner-audit.ndjson`. Over budget, trimming keeps manifest, structured failures and completeness first and trims global logs before owner audit; sources are never trimmed. Temporary data is removed on success and on failure, and failure returns `diagnostic_export_failed` without changing owner state or publishing a partial ZIP.

Because the audit module reports failure as a value rather than throwing, a user-initiated export re-raises it into the calling surface's existing local error channel. Pi Conversation shows it through its composer error; Pi Skill Run shows it as a surface notice owned by the surface, never by the run or the coordinator; Backend Manager shows it in its status line. None of these paths changes a run's terminal outcome.

Two product surfaces own the entries. The selected Pi owner's Details drawer exposes the scoped export, and Backend Manager's Built-in Agent section exposes the global export. The host save picker owns the target: cancelling performs no export and publishes no result. An export binds the owner captured when the action arrived, so a selection change while the dialog is open cannot redirect it. The action is a plain details button and adds no new region, so transcript, loading and streaming updates still preserve every unrelated managed region's DOM identity.

## No health subsystem

Diagnostics are passive. There is no health panel, no periodic sweep, no active probe, no liveness endpoint and no background export. Diagnostic Mode and the debug switch only widen which structural facts are admitted at the moment a producer records one; neither schedules anything and neither reaches outside the plugin. An active probe would be a separate, explicitly authorized decision, not a follow-up of this contract.

## Consequences

- Pi SDK objects do not become durable transcript types; persistence validates a project-owned snapshot with Pi's field shape and semantics.
- `state_unknown` and `recovery_required` remain effect/recovery states rather than failure-cause categories.
- Debug detail increases structural evidence, not the amount of private semantic content copied into audit files.
- Already sealed success cannot be downgraded by projection, notification, audit or cleanup failures.
- Process startup reconciliation, crash and staging recovery, unknown-effect reconciliation and Skill Run retention scheduling consume these same boundaries later; they are not part of this decision and do not change the audit or export contracts described here.
