# ACP Trace Recorder and Replay Profiler

## Purpose

The debug Dashboard separates workload capture from measurement:

- **ACP Trace Recorder** records one real ACP Chat conversation or one complete
  ACP Workflow execution as an unaggregated semantic event stream. The runtime
  profiler remains off while recording.
- **ACP Replay Profiler** loads one complete local trace, contacts no backend,
  and profiles nine synthetic replays across `closed`, `open-inactive`, and
  `target-active` Assistant Workspace surfaces.

The two tools are mutually exclusive. Chat and Workflow traces are different
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

Defaults are 256 MiB total, 250,000 events, and 16 MiB per event. Dashboard
overrides can only lower those limits before arming. Quota exhaustion freezes
immediately; it never silently drops events and continues.

## Replay Matrix

Choose a complete `.ndjson` trace, governance phase, and cadence:

- `recorded` waits each original monotonic gap after the previous event has
  finished consuming; it does not catch up with a burst.
- `burst` applies the next event immediately after the prior consumer finishes.

One action always runs surfaces in `closed`, `open-inactive`, `target-active`
order. Each surface has one warm-up and two formal runs. Every run uses fresh
synthetic owners. Workspace setup, drain, cleanup, and restoration are outside
the profile window; the prior Workspace state is restored in a `finally` path.

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
dispatch is not exposed.

The result directory contains `zotero-agents.acp-runtime-replay-matrix.v1` JSON
and a Markdown surface summary. Governance comparison requires identical trace
digest, source kind, cadence, R2 workload version, and replay configuration.
Unknown events, consumer failure, abort, or failed drain make the matrix
incomplete.

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
in Zotero. Replay each without a running backend and confirm nine records, a
stable trace digest on rerun, correct surface attribution, and Workspace state
restoration. Repeat the host check for the supported Zotero 7 and Zotero 9
families before treating host performance evidence as accepted.

Use Gecko Profiler for CPU stacks and flame graphs. It is complementary and is
not part of semantic trace replay.
