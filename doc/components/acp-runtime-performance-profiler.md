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
first complete matching root binds the recorder. Chat traces may contain many
turns. Workflow traces retain the workflow/run/job/stage/request hierarchy and
interleaving.

The state sequence is `idle -> armed -> recording -> frozen -> saved`. Events
carry consecutive sequence numbers and monotonic offsets. NDJSON is buffered to
`.partial`; Stop flushes and checks event count, UTF-8 byte count, SHA-256, and
footer before an atomic rename. A crash leaves the partial file for diagnosis.
Mid-turn starts, active requests at Stop, write/integrity failure, or quota
failure produce an incomplete trace that replay rejects.

Cancel drains buffered writes, writes an incomplete `user-canceled` footer,
releases diagnostic ownership, and preserves the `.partial` file. Frozen
incomplete and saved rounds expose **New Recording**, which resets only
in-memory ownership and counters. It never deletes the prior partial or saved
trace, and no Zotero restart is required.

Defaults are 256 MiB total, 250,000 events, and 16 MiB per event. Dashboard
overrides can only lower those limits before arming. Quota exhaustion freezes
immediately; it never silently drops events and continues.

## Replay Matrix

Choose or type a complete `.ndjson` trace, review its schema, source kind,
digest, creation time, event count, bytes, and completion preflight, then choose
governance phase and cadence:

- `recorded` waits each original monotonic gap after the previous event has
  finished consuming; it does not catch up with a burst.
- `burst` applies the next event immediately after the prior consumer finishes.

One action normally runs surfaces in `closed`, `open-inactive`, `target-active`
order. Each surface has one warm-up and two formal runs. Every run uses fresh
synthetic owners. Workspace setup, cleanup, and restoration are outside the
profile window; the final target drain is inside it so delayed persistence and
publication remain attributed to the run. The prior Workspace state is restored
in a `finally` path.
For an open surface, setup waits for the Workspace shell handshake, the active
child panel handshake, and the expected synthetic owner instead of treating
frame creation as readiness. The host then publishes a drain marker and waits
for the child panel to acknowledge it after that panel's render frame. For
`target-active`, the same render acknowledgement runs after trace and R2
consumption and before the profiler window closes. `open-inactive` does not
force an opposite-tab snapshot during measurement: target R3 is expected to
remain zero. `closed` marks R3 not applicable. Readiness, owner, or render
acknowledgement timeouts make the affected record incomplete; cancellation
interrupts these waits.
Workflow `target-active` selects the first replay request, whose stable
synthetic id is `<root>-request`; later requests receive distinct ids.
Child readiness is retained while the same Workspace shell document remains
mounted, including close/reopen and library/reader target commits. On shell
startup, child frame load, and every host initialization, the shell probes each
child for an idempotent ready declaration. This recovers both an eager ready
message sent before the shell listener existed and one rejected before the host
had an active target. Replacing the shell window clears readiness and requires
the replacement children to declare ready again.
The Dashboard publishes each completed record as `completed/9` only after the
profile has finished and the target has cleaned up. Cancel interrupts a
recorded cadence wait, prevents future runs, saves the completed prefix as an
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

The result directory contains `zotero-agents.acp-runtime-replay-matrix.v2` JSON
and a Markdown report. Each run has independent execution and measurement
completion. Measurement coverage reports R1 semantic/projection work, measured
R2, and surface-specific R3 as captured, expected-zero, not-applicable, or
missing. Diagnostics and lifecycle markers consumed without projection are
counted separately from projected events. The report includes both formal runs'
wall-time range and mean, event and byte throughput, delta from `closed`, and
per-metric R1/R2/R3 totals. Two formal observations are descriptive only.

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
npm run check:acp-profiler-release-elision
```

It independently verifies zero bytes for non-debug, Recorder-disabled, and
Replay-disabled builds.

## Manual Zotero Acceptance

Capture one real multi-turn Chat trace and one real multi-stage Workflow trace
in Zotero. For each host, verify save-to-Replay handoff, live nine-record
progress, cancellation with an incomplete result, retry with fresh owners, and
a second recording round without restart. Replay without a running backend and
confirm a stable trace digest, correct surface attribution, and Workspace state
restoration. Repeat for Zotero 7 and Zotero 9 before treating host performance
evidence as accepted.

Use Gecko Profiler for CPU stacks and flame graphs. It is complementary and is
not part of semantic trace replay.
