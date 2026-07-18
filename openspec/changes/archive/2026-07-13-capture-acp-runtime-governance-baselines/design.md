## Context

The archived profiler change introduced bounded request-scoped aggregates and
release-elided hot-path instrumentation. Its automated baseline, however,
constructs the expected numbers by calling recorder functions directly. The
repository therefore has no durable evidence that the R1 JSON-RPC/persistence,
R2 Host Bridge, and R3 Assistant Workspace publication seams jointly emit a
repeatable pre-governance workload. Real Zotero users can only obtain a snapshot
indirectly through diagnostic bundles or test-runner environment hooks.

This change must preserve the stricter constraints already attached to ACP
transcript rendering: performance data cannot enter Assistant Workspace
snapshots, chrome keys, transcript keys, or shared-region signatures. It must
also preserve zero profiler hot-path work outside the debug feature boundary.

## Goals / Non-Goals

**Goals:**

- Keep one compile-time-foldable profiler availability switch in
  `debugMode.ts` and a separate explicit recording lifecycle.
- Produce a deterministic, committed before-governance mechanism record from
  production seams without requiring Zotero.
- Use one sanitized record DTO and R1/R2/R3 grouping for automated and real-host
  exports.
- Provide an isolated Dashboard surface for actual Zotero capture and export.
- Make capture state, snapshots, and file writes observational and bounded.

**Non-Goals:**

- Fix R1, R2, R3, or claim that mock measurements reproduce Zotero timing.
- Add a preference, environment flag, console API, backend/workflow-specific
  label, raw sample stream, or automatic profile upload.
- Poll the profiler continuously or couple it to Dashboard/Assistant Workspace
  high-frequency render keys.
- Automatically delete user-saved real-host captures.

## Decisions

### Hard-coded feature availability plus explicit recording

`debugMode.ts` owns a literal profiler feature switch. Call sites use the
literal together with the build-time debug guard so esbuild can eliminate the
profiler when either boundary is false. The switch controls availability and
Dashboard tab presence; it does not allocate recorder state. Recording moves
through `idle -> recording -> frozen`, and only `recording` owns aggregate maps
or the drift timer.

This avoids a hidden preference and makes a source build self-describing. It
also lets the tab remain visible after recording stops so the frozen result can
be inspected and saved.

### One discriminated governance record

A pure module defines `zotero-agents.acp-runtime-governance-baseline.v1` and the
single metric-to-risk grouping. Automated records retain deterministic counters,
bytes, peaks, and duration invocation counts. Zotero-host records additionally
retain the bounded profiler snapshot with real duration/histogram aggregates.
Both forms carry capture kind, phase, scenario metadata, runtime environment,
completion status, warnings, and the same grouped summary.

Arbitrary prompt/output text, commands, paths, backend/provider/workflow ids,
and raw samples are excluded. User-entered `scenarioId` is normalized and
length-bounded.

### Production-seam fixture instead of recorder simulation

The test harness starts a profile but sends the workload through existing
production test seams: ACP connection/adapter delivery and persistence, Host
Bridge input and handler, Assistant Workspace publication, and the buffered
write coordinator. A narrow R3 test adapter invokes the same private
prepare/signature/post pipeline with a fake host and frame; it does not add a
second implementation of the publication logic.

The generated mechanism record drops machine-dependent duration values. The
recording command runs the normalized workload twice and refuses to write unless
the results match. It refuses to replace an existing before-governance artifact
without `--force`.

### Explicit Dashboard snapshots, no profiler polling

The profiler tab is included only when debug mode and the source switch are
true. Its view has its own selected-surface signature. `Start`, `Refresh`, and
`Stop` are explicit host actions; no periodic Dashboard or task-update refresh
reads profiler state. Stopping snapshots before disabling the recorder and
marks the capture incomplete when active profiles remain.

The static Dashboard renderer receives only the selected profiler view. No
performance revision or metrics enter Dashboard chrome or any Assistant
Workspace projection.

### Durable local export through runtime primitives

Real-host JSON is written to a unique temporary file and atomically moved under
`<Zotero.DataDirectory>/zotero-agents/runtime/profiles/acp-runtime/`. Successful
saves expose the path and folder-launch action only in the profiler tab. Capture
files are not part of runtime-log retention and are not automatically removed.

## Risks / Trade-offs

- **The debug tab itself can perturb measurements** -> avoid polling; profile
  snapshots are produced only on explicit user actions.
- **A user can stop before a run reaches terminal state** -> retain the evidence
  but mark it incomplete and show a warning.
- **A deterministic fixture cannot validate Gecko scheduling** -> exclude
  machine timing from the committed mechanism record and document a separate
  Zotero 7/9 campaign.
- **A new R3 seam could diverge from production** -> expose one narrow adapter
  around the production publication function instead of duplicating its logic.
- **Static Dashboard assets exist in release packages** -> keep recorder and
  capture modules release-elided and make the dormant renderer unreachable with
  no timer, state, or hot-path work.
