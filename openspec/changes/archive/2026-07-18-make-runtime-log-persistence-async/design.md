## Context

The retained runtime-log document can reach several megabytes. The current pipeline hydrates and saves it through synchronous Node file access when available and wraps asynchronous Zotero writes in a synchronous-looking save path. In the Zotero host this prevents reliable file hydration, lets flush return before `IOUtils.writeUTF8` completes, and permits concurrent whole-document writes whose completion order differs from their revision order. Append and Task Manager refresh paths also materialize complete snapshots even when they need only one entry or aggregate metadata.

The runtime-log file remains a JSON document with the existing schema and retention limits. The implementation must work in Zotero 7 and Zotero 9 plugin runtimes without importing Node-only APIs, preserve redaction and diagnostic semantics, and avoid making persistence caches a correctness source of truth.

## Goals / Non-Goals

**Goals:**

- Make startup hydration, migration, save, flush, clear, shutdown, and category cleanup explicitly asynchronous and correctly ordered.
- Ensure only one runtime-log document write is in flight and that dirty revisions created during a write are subsequently persisted.
- Bound event-loop stalls and transient memory by streaming the document from cached serialized entries into surrogate-safe chunks before atomic replacement.
- Remove full-snapshot construction from append notifications and routine Task Manager refreshes.
- Preserve the existing on-disk JSON schema, retention/drop accounting, filtering, redaction, diagnostic bundle, and UI text.

**Non-Goals:**

- Migrating runtime logs to JSONL, a database, a worker, or a new storage schema.
- Changing retention values, debug policy, diagnostic bundle schema, or profiler event schema.
- Governing debug-audit, job-progress, transport-queue, or ACP transcript behavior.
- Claiming Zotero 7 host acceptance when only Zotero 9 is available for this change.

## Decisions

### Cache one serialized representation per retained entry

Each sanitized entry is serialized once when accepted. The retained internal record stores the public entry and its serialized JSON string/UTF-8 byte count. Retention uses that byte count, and document persistence emits the same string. Public list, filter, listener, summary, and bundle APIs expose entries rather than the internal cache record.

This avoids repeated full-entry serialization and keeps byte accounting aligned with persisted content. Caching whole documents was rejected because every append would invalidate the cache and still require a multi-megabyte string allocation.

### Use an explicit hydration lifecycle

`initializeRuntimeLogsPersistence()` performs the only startup file hydration and is awaited before runtime preflight can produce logs. A missing file can fall back to the legacy preference; the preference is cleared only after the migrated document is durably written. Read or parse failure leaves the existing file untouched, starts with an empty in-memory pipeline, and increments persistence failure accounting.

List, snapshot, summary, and diagnostic-bundle APIs are pure in-memory reads. Implicit hydration or persistence from read paths is rejected because it hides ordering and makes UI polling mutate storage.

### Use a revisioned single-flight save state machine

Every accepted mutation advances `changeRevision`. `durableRevision` records the newest successfully replaced document. At most one save loop owns `inFlightSave`; it captures a revision and immutable retained-record view, writes it, then either advances durability or preserves dirty state after failure. If a newer revision appeared during the write, the same drain loop writes again without starting a concurrent document build.

Normal appends use a 250 ms idle debounce plus a 2 s maximum-delay timer for a dirty burst. Explicit flush, clear, and shutdown cancel both timers and drain immediately. `flushRuntimeLogsPersistence()` resolves only when the drain is clean after revisions observed during that drain; persistence failures do not escape business logging paths and remain retryable on the next flush.

### Stream a JSON document through atomic chunk replacement

`runtimePersistence` provides a generic atomic text replacement primitive. It creates a unique temporary file beside the target, emits text fragments through the existing surrogate-safe 256 KiB append policy, and replaces the target only after every append succeeds. Failure removes the temporary file where possible and never moves a partial document over the old target.

Runtime-log persistence supplies a prefix, each cached serialized entry separated by commas, and a suffix. The implementation may aggregate only up to the chunk bound and never creates the complete document string. Direct whole-file writes were rejected because they retain the observed allocation and timer-gap peaks; JSONL and schema migration were rejected as unnecessary scope.

### Publish lightweight observation data

Listeners receive a `RuntimeLogChange` containing revision, change kind, the appended entry when applicable, and evicted entry IDs. `getRuntimeLogSummary()` derives counts, byte/drop/retention budgets, and backend/workflow facets without cloning retained entries. Task Manager combines this summary with a filtered list capped at 300 visible rows.

### Coordinate cleanup with log writes

The runtime-log clearer registration accepts an asynchronous callback. Logs-category cleanup first awaits the registered clear/drain operation and only then removes the directory. This prevents a late in-flight save from recreating deleted runtime-log storage.

## Risks / Trade-offs

- [Serialized-entry caching increases retained heap] → Remove repeated details deep copies and full snapshot/document allocations; account the cached UTF-8 size under the existing retention budget.
- [A failed save can keep the pipeline dirty indefinitely] → Count the failure, preserve the last durable file, and retry on explicit flush or the next scheduled mutation.
- [A continuous append stream can postpone idle persistence] → The independent 2 s maximum-delay timer starts with the dirty burst and is not reset by later appends.
- [Clear can race with an already captured save] → Treat clear as a newer revision, drain the single flight through that revision, and make category cleanup await it before directory removal.
- [Temporary files can remain after host termination] → Use unique same-directory names and best-effort cleanup on failure; successful replacement removes the temporary path.
- [Zotero file APIs differ from Node test doubles] → Keep the primitive behind existing runtime-path operations and cover it in both Node governance tests and a small real-host core-lite gate.

## Migration Plan

1. Deploy the new reader against the unchanged runtime-log document schema.
2. On first initialization, prefer the existing runtime-log file; when absent, hydrate a valid legacy preference and durably write it before clearing the preference.
3. If initialization or persistence fails, retain the previous file and continue with an in-memory pipeline so logging cannot break business execution.
4. Rollback requires no data conversion because the stored document schema is unchanged.

## Open Questions

None. Zotero 7 host execution remains a follow-up acceptance environment rather than an implementation decision.
