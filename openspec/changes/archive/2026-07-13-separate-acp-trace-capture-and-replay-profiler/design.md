## Context

The current debug profiler has bounded aggregate instrumentation and a Dashboard Live Capture controller that freezes a derived governance record. That path observes a non-repeatable live backend workload and couples capture lifecycle to profiling lifecycle. Chat and ACP Skills already share transcript-boundary classification, but publish through distinct stores and UI ownership models. The replacement must preserve those production seams while ensuring raw traces never invoke transport, backend, MCP, Host Bridge mutation, library mutation, convergence, apply-back, or the original workspace during replay.

The implementation is debug-only, source-elided in release bundles, local-only because payloads are intentionally complete and sensitive, and constrained by Assistant Workspace region-signature and transcript owner/page invariants.

## Goals / Non-Goals

**Goals:**

- Capture one lossless, source-bound semantic ACP event stream before Chat/Skills projection diverges.
- Persist bounded, integrity-checked NDJSON using a crash-visible partial file and atomic finalization.
- Replay a validated trace into source-specific production projection seams without backend or mutation side effects.
- Produce a deterministic nine-run surface matrix with symmetric Chat/Skills profiling and explicit provenance/completeness.
- Keep Recorder and Replay Profiler independent, mutually exclusive, debug-only, and removable by separate source switches.

**Non-Goals:**

- Capturing JSON-RPC wire frames, credentials, transport authorization, or tokens.
- Sanitizing or truncating semantic payloads, uploading traces, or making them safe to commit.
- Replacing Gecko Profiler CPU stack/flame-graph analysis.
- Treating the cold full-mirror cache or replay fixture as a transcript correctness source of truth.
- Comparing Chat traces with Workflow traces or incompatible replay configurations.

## Decisions

### Versioned discriminated trace envelopes

`zotero-agents.acp-runtime-semantic-trace.v1` uses a header, sequential event records, and footer. Events carry `seq`, monotonic offset, logical owner, and a discriminated payload for root/request/turn lifecycle, complete `SessionNotification`, diagnostic, permission request/outcome, terminal, or connection close. Source kind is fixed in the header and every owner is trace-local. Transcript boundaries are deliberately absent and are recomputed through `acpTranscriptBoundary.ts` during replay.

Alternative: persisting projected transcript items was rejected because it would freeze derived behavior, omit semantic inputs, and prevent regression testing of the shared classifier.

### Recorder owns an append-only partial file

The recorder state machine is `idle -> armed -> recording -> frozen -> saved`. Arming selects exactly one source kind; the first complete matching root binds the recording. Buffered UTF-8 NDJSON is written to a permission-restricted `.partial` path. Stop flushes, validates sequence/count/bytes/digest/footer, and atomically renames only complete traces. Quota, ownership, mid-turn, active-owner, write, and integrity failures freeze as incomplete without dropping events.

Alternative: an in-memory JSON document was rejected because a real multi-stage workflow can exceed memory-safe diagnostic size and would hide crash recovery evidence.

### One semantic tap plus explicit non-adapter producers

`AcpConnectionAdapter` emits complete session notifications before Chat/Skills consumers diverge. Chat prompt/turn lifecycle, workflow/root/request lifecycle, permission outcome, terminal, and connection-close producers publish explicit semantic events through the same recorder facade. The facade is inert unless the recorder source switch and debug mode are enabled.

Alternative: separate Chat and Skills recorders were rejected because notification semantics and ordering would drift.

### Replay targets map owners, not semantic correlation ids

Each replay creates a fresh synthetic root/owner mapping. Chat targets construct a synthetic conversation and use Chat projection/store/persistence/publication seams. Workflow targets construct a synthetic execution plus all request owners and use ACP Skills run/transcript/publication seams. Tool-call and other correlation IDs remain unchanged inside payloads. Source mismatch is rejected before setup.

Alternative: replaying directly into DOM or profiler recorder APIs was rejected because it would bypass the production behavior being measured.

### Sequential scheduler with two cadences

Recorded cadence waits the original monotonic gap only after the previous consumer drains; it never catches up with a burst. Burst cadence immediately applies the next event after consumer completion. Unknown events, consumer failures, aborts, or drain failures are counted and mark the matrix incomplete.

### Runner owns Workspace setup and restoration outside profile windows

The matrix order is fixed: `closed`, `open-inactive`, `target-active`; each surface executes one warm-up followed by two formal runs. Every run gets fresh owners. Workspace snapshot, surface switching, owner publication, drain, cleanup, and restoration occur outside profile windows. Closed emits no R3; open surfaces use their exact attribution.

### R2 is a versioned synthetic workload

`ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1` injects one single-frame health input, one 16-fragment health input with 5 ms gaps, and eight concurrent two-fragment health inputs through the parser/input/no-op response seam. It is not written into the trace and cannot reach mutation dispatch.

### Comparable matrices require exact provenance

`zotero-agents.acp-runtime-replay-matrix.v1` records trace schema/digest, source kind, cadence, R2 version, replay configuration and environment, nine profile records, run roles, counts/bytes/lag/drain status, and Markdown summary. Only formal records with matching provenance form a governance comparison family. Surface-varying R1 results remain visible rather than normalized away.

## Risks / Trade-offs

- [Trace files contain complete prompts, outputs, and tool payloads] -> Keep files local, forbid copy/upload/submit actions, show an explicit sensitivity warning, and request the strictest platform file permissions.
- [A crash leaves a large partial file] -> Preserve `.partial` for explicit recovery inspection; validate it before allowing finalization and never silently treat it as a baseline.
- [Semantic hooks could add hot-path overhead] -> Compile each subsystem behind an independent source switch and verify zero-byte release elision.
- [Replay can accidentally escape into host mutation] -> Targets receive narrow no-side-effect ports; tests install fail-fast transport/backend/MCP/Host Bridge/library/apply-back sentinels.
- [Workspace automation can disturb user state] -> Snapshot before setup and restore in a `finally` path after success, abort, or failure.
- [UI publication can violate transcript identity invariants] -> Reuse owner-first/page-first stores and region-local signature guards; add identity regression coverage rather than introducing a replay-only UI path.

## Migration Plan

1. Add trace DTO/validation/persistence and recorder tests behind its source switch.
2. Add replay DTO/scheduler/targets/matrix runner and safety tests behind a separate switch.
3. Make Chat/Skills profiler lifecycle and R3 attribution symmetric.
4. Replace the Dashboard Live Capture workflow with Recorder and Replay Profiler surfaces.
5. Remove obsolete capture/copy code, reclassify automated baseline artifacts, update docs/specs/audit, and validate both release-elision builds.

Rollback removes the two switched modules and restores the prior Dashboard snapshot/action wiring; local trace and matrix files are diagnostics and are never deleted by migration.

## Open Questions

None. Manual Zotero 7/9 acceptance remains an explicit host validation step after automated gates.
