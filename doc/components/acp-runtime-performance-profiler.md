# ACP Trace & Replay

## Purpose

The debug Dashboard presents workload capture and measurement as one two-step
workflow while keeping their runtime state independent:

- **ACP Trace Recorder** records one real ACP Chat conversation or one complete
  ACP Workflow execution as an unaggregated semantic event stream. The runtime
  profiler remains off while recording.
- **ACP Replay Profiler** loads one complete local trace, contacts no backend,
  and profiles nine synthetic replays across `closed`, `open-inactive`, and
  `target-active` Assistant Workspace surfaces.

Saving a complete trace automatically selects and validates it in the Replay
step. A native file picker and editable path remain available for historical
traces. The two tools are mutually exclusive. Chat and Workflow traces are different
baseline families and cannot be replayed through, or compared with, the other
source target.

## Security Boundary

`zotero-agents.acp-runtime-semantic-trace.v1` preserves complete prompts,
assistant text, tool arguments, tool output, diagnostics, and permission
outcomes. It is not sanitized or truncated. It records semantic ACP events,
not JSON-RPC wire frames, so transport authorization and tokens are excluded.

Trace files stay under the local Zotero Agents runtime directory with the
strictest available file permission. The Dashboard provides Save and Open
Folder, but no clipboard, upload, or submission action. Review a trace as
sensitive local data.

## Recorder Contract

Select `ACP Chat conversation` or `ACP Workflow execution` before arming. The
recorder then waits for an eligible source-owned claim. Chat binds only after
the next user-initiated Connect or Reconnect successfully creates, resumes, or
loads a remote session; an already-live session, an implicit prompt connection,
background recovery, and connection-time events cannot claim it. The binding is
fixed to backend, local conversation, and remote session. A reconnect to the
same remote session continues capture, while a replacement session is ignored
and shown as a non-fatal Dashboard notice. Chat traces may contain many turns.

Workflow capture binds only when a new top-level execution has at least one
executable ACP request. Its root is the canonical workflow execution `runId`;
ordinary requests and every concrete sequence stage retain their existing
public identities while sharing that one transient recording root. Recovery
and zero-request executions cannot claim an armed recorder.

The state sequence is
`idle -> armed -> recording -> stopping -> frozen -> saved`. Events carry
consecutive sequence numbers and monotonic offsets. A complete trace starts
with exactly one `root-start`, ends with exactly one `root-end`, and contains at
least one paired turn or request activity. NDJSON is buffered to `.partial`;
Finish appends the root end, checks event count, UTF-8 byte count, SHA-256, and
footer, then enables the atomic save rename. A crash leaves the partial file for
diagnosis. Pre-claim events are ignored. Write/integrity or quota failure
produces an incomplete trace that replay rejects.

Chat Finish becomes available only after one turn completes. If another turn
is active, Finish enters `stopping`, rejects a new turn, and freezes after the
active turn terminal is recorded. Cancel is always available and preserves an
incomplete partial. Workflow capture closes request activity at terminal and
automatically finishes after the execution queue becomes idle, before the
workflow apply seam. A failed or canceled workflow can still be
capture-complete because business outcome and event-stream completeness are
separate.

Cancel drains buffered writes, writes an incomplete `user-canceled` footer,
releases diagnostic ownership, and preserves the `.partial` file. Frozen
incomplete and saved rounds expose **New Recording**, which resets only
in-memory ownership and counters. It never deletes the prior partial or saved
trace, and no Zotero restart is required.

Defaults are 256 MiB total, 250,000 events, and 16 MiB per event. Dashboard
overrides can only lower those limits before arming. Quota exhaustion freezes
immediately; it never silently drops events and continues.

## Replay Matrix

Choose or type a complete `.ndjson` trace, review its filename-derived sample
name and preflight, then enter a required governance stage and choose cadence.
Stages are free text so one trace can be replayed through any number of
governance rounds. They are normalized for whitespace and retained across file
selection, preflight, cancellation, and retry.

- `recorded` waits each original monotonic gap after the previous event has
  finished consuming; it does not catch up with a burst.
- `logical` advances trace time without sleeping through idle gaps. It executes
  replay-owned 16 ms Workspace publication, 160 ms live publication, and
  2000 ms persistence timers at their logical deadlines, with equal deadlines
  ordered by registration. It is the routine regression cadence for timer
  grouping, persistence, and publication behavior.
- `burst` applies the next event immediately after the prior consumer finishes.

Logical cadence does not reproduce recorded wall time, throughput, scheduler
lag, event-loop drift, or wall-clock-dependent request duration. Reports retain
those values as synthetic diagnostics and mark them non-comparable with
recorded timing. Recorded remains the low-frequency wall-clock reference.

One action normally runs surfaces in `closed`, `open-inactive`, `target-active`
order. Each surface has one warm-up and two formal runs. Every run uses fresh
synthetic owners. Workspace setup, cleanup, and restoration are outside the
profile window; the final target drain is inside it so delayed persistence and
publication remain attributed to the run. The prior Workspace state is restored
in a `finally` path.
For an open surface, setup waits for the Workspace shell handshake, the active
child panel handshake, and the expected synthetic owner instead of treating
frame creation as readiness. A debug-exclusive publication sidecar captures the
target child `Window` and current revision, registers a temporary listener, and
then asks a cold Workspace diagnostics port to publish that tab. It accepts
only a matching snapshot with a newer revision and resolves in the child's next
animation frame, after the child's normal message/render listener. Zotero may
omit `MessageEvent.source` or expose the shell through a direct/Xray-wrapped
`Window`; an absent source is therefore treated as unverifiable, while a
non-null source is rejected only when it is not direct/`wrappedJSObject`
equivalent to the captured shell. Timeout,
cancellation, unload, and frame replacement share one cleanup path. The normal
Workspace host snapshot protocol and Chat, ACP Skills, and SkillRunner child
render queues contain no Replay marker, property read, action, or hook. For
`target-active`, the same rendered publication wait runs after trace and R2
consumption and before the profiler window closes. `open-inactive` does not
force an opposite-tab snapshot during measurement: target R3 is expected to
remain zero. `closed` marks R3 not applicable. Readiness, owner, or render
timeouts make the affected record incomplete; cancellation interrupts these
waits.
Workflow `target-active` selects the first replay request, whose stable
synthetic id is `<root>-request`; later requests receive distinct ids.
Child readiness is retained while the same Workspace shell document remains
mounted, including close/reopen and library/reader target commits. On shell
startup, child frame load, and every host initialization, the shell probes each
child for an idempotent ready declaration. This recovers both an eager ready
message sent before the shell listener existed and one rejected before the host
had an active target. Replacing the shell window clears readiness and requires
the replacement children to declare ready again.
Before each run, the Dashboard publishes the current surface, role, run number,
matrix position, and start time outside the profile window. A browser-local
timer updates without requesting host snapshots. The 3×3 matrix then marks each
record complete only after the profile has finished and the target has cleaned
up. Cancel interrupts a
recorded cadence wait or logical timer batch, prevents future runs, saves the completed prefix as an
incomplete matrix, restores Workspace state, and leaves the selected trace and
options ready for retry.

Cancellation is owned by the Replay controller and does not depend on Zotero
exposing the browser `AbortController` global. Dashboard start actions await the
controller lifecycle so startup failures cannot disappear as unobserved
Promise rejections.

Replay uses the real source-specific projection seams and the shared
`acpTranscriptBoundary.ts` classifier. It cannot launch transport/subprocess,
contact a model/backend or MCP server, respond to real permissions, run Host
Bridge mutations, mutate the Zotero library, converge/apply results, or write
the original workspace. Recorded permission outcomes only converge synthetic
UI state.

Every profile window also executes
`ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1`: one single-frame health input, one
16-fragment input with 5 ms gaps, and eight concurrent two-fragment inputs. It
uses the production NDJSON parser/input seam and a no-op output; mutation
dispatch is not exposed. Its immutable coverage is 10 requests, 33 fragments,
536 input bytes, and maximum concurrency 8. Parser/input duration, fragment and
byte counts, request duration/inflight, and serialized no-op response bytes are
recorded in the run profile.

The result directory contains paired
`acp-replay-{sample}__{stage}__{cadence}__{timestamp}-{nonce}.json/.md`
artifacts. Their exact sample display name, stage, and cadence are also recorded
in matrix provenance; sample aliases do not replace the trace digest as
comparison identity. Each run has independent execution and measurement
completion. Measurement coverage reports R1 semantic/projection work, measured
R2, and surface-specific R3 as captured, expected-zero, not-applicable, or
missing. Diagnostics and lifecycle markers consumed without projection are
counted separately from projected events. The report includes both formal runs'
wall-time range and mean, event and byte throughput, delta from `closed`, and
per-metric R1/R2/R3 totals. Dashboard defaults to the same per-surface summary;
raw metadata, paths, per-run measurement families, drain status, and warnings
remain available in expandable evidence. Two formal observations are
descriptive only.
For logical cadence, semantic disposition, persistence, change, publication,
and payload evidence remain valid. Timing headings and provenance explicitly
identify scheduler version 1 and synthetic timing.

Governance comparison requires identical trace digest, source kind, cadence,
R2 workload version, and replay configuration, with both completion dimensions
complete. Unknown events, consumer failure, abort, failed drain, or missing
required measurements prevent comparison. Matrix v1 files remain readable as
legacy execution artifacts, but are measurement-incomplete and cannot be
compared with v2 evidence.

## Automated Smoke Baseline

`npm run record:acp-runtime-before-baseline` remains a deterministic CI
mechanism smoke test for R1/R2/R3 production seams. It is not a real-workload
latency baseline and is not compared with replay matrices.

The source-elision gate is:

```bash
npm run check:runtime-diagnostics-release-elision
```

It reads the same production-isolation manifest as esbuild and verifies the
real entry's exclusive-module byte contribution plus forbidden executable
markers for non-debug, Recorder-disabled, Replay-disabled, and
SkillRunner-connection-audit-disabled builds. Non-debug Replay on/off equality
is auxiliary evidence. Static Dashboard templates, locale labels, hidden route
keys, and type-only DTOs remain narrowly allowlisted. Logical timer and
publication-sidecar exports are removed with Replay. When Replay is compiled
but no logical run is active, the Chat, Skills, and Workspace scheduling paths
remain direct native `setTimeout` calls with no replay lookup, branch,
allocation, or module initialization.

## Manual Zotero Acceptance

Capture one real multi-turn Chat trace and one real multi-stage Workflow trace
in Zotero. Exercise explicit new/resume/load binding, same-session reconnect,
disconnect recovery, the replacement-session notice, Finish during an active
turn, and automatic Workflow completion. For each host, verify save-to-Replay handoff, live nine-record
progress, cancellation with an incomplete result, retry with fresh owners, and
a second recording round without restart. Replay without a running backend and
confirm a stable trace digest, correct surface attribution, and Workspace state
restoration. Also exercise Unicode sample/stage filenames and the responsive
3×3 layout. Repeat for Zotero 7 and Zotero 9 before treating host performance
evidence as accepted. This manual acceptance remains pending until both hosts
have been exercised.

Use Gecko Profiler for CPU stacks and flame graphs. It is complementary and is
not part of semantic trace replay.
