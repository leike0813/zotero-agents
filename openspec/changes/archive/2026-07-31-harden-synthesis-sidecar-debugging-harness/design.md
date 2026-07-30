## Context

The sidecar currently feeds one event shape into runtime logs, the Zotero
console, and the Task Manager page. Production callers still construct success
events before the sink drops them, native code always serializes debug NDJSON,
and the static Dashboard retains executable Synthesis diagnostics. The page
then reduces runtime logs back into a shallow timeline.

Reference Refresh separately admits an 8 MiB materialized request, but both
ends of reverse-Host enforce a global 1 MiB response cap. The endpoint replaces
an oversized response with a small 503 envelope and records that replacement
size, while the native and plugin RPC layers discard the nested reason. The
shared memory response writer also assumes each output-stream call accepts the
entire chunk; Gecko can accept only a prefix, producing a truncated body under
an otherwise valid `Content-Length`.

## Goals / Non-Goals

**Goals:**

- Provide a useful, payload-free, correlated debug workspace for the current
  Rust sidecar stabilization period.
- Keep production failure evidence in runtime logs while eliminating all
  success-path debug construction, serialization, parsing, retention, and UI.
- Align reference artifact delivery with the existing 8 MiB application
  contract and preserve the exact failure cause through every boundary.
- Keep failed preparations retryable in the same process.

**Non-Goals:**

- Persist debug timelines across Zotero restarts.
- Display library payloads, credentials, locators, note text, WebDAV content,
  or unrestricted process output.
- Introduce artifact chunking, a new public sidecar capability, a second native
  binary, or a sidecar release/prebuild.

## Decisions

### Two diagnostic planes

Production uses a failure-only recorder invoked from failure branches. It emits
one bounded runtime-log summary with stable component, stage, code, request,
operation, instance, duration, status, attempted/limit bytes, and safe counts.

The debug plane owns start/success/failure events, console mirroring, the
session store, page projection, and diagnostic export. It is compiled only
when `SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED && __debug_mode__`. Its FIFO keeps
the latest 500 sanitized events across child-process restarts but not across a
Zotero restart. Failure recording is not implemented by mirroring the debug
store back into runtime logs.

Native launch configuration carries `diagnosticsEnabled`. Native failures
always emit the small failure envelope; start/success events are not allocated
or serialized when the flag is false. A single disabled boolean check is the
only steady-state native cost because debug and production share one binary.

### One structured Dashboard group and one debug projection

Dashboard tabs carry a `group: "system" | "backend"` field. Rendering uses
that field instead of a growing tab-key exclusion list. Synthesis Sidecar is a
system tab.

The page shows a current-instance header, a filterable event table, and a
selected-event inspector. Rows include time, status, component, stage,
capability, code, duration, HTTP status, and byte counts. Selecting a row shows
its complete sanitized event and all retained events sharing operation ID,
request ID, or attempt ID. The existing runtime-log-derived lifecycle timeline
is removed.

### Build-exclusive Dashboard diagnostics

The Dashboard script becomes an esbuild entry with the same debug and source
defines used by the plugin entry. The production-isolation manifest covers the
debug recorder/store/projection and Dashboard markers. Release acceptance
checks the real production plugin and Dashboard outputs for zero exclusive
module bytes and absent executable markers. Static labels are not an exemption
for the Synthesis diagnostic page.

### Capability-specific reverse-Host limits

General reverse-Host responses retain the 1 MiB and two-second limits.
`library.artifacts.read` uses an 8 MiB response-body limit and ten-second
timeout. The policy is a shared capability lookup consumed by the TypeScript
endpoint and mirrored exactly in Rust with parity tests; it is not a global
limit increase.

Artifact descriptors carry the exact serialized payload estimate already
available at the Host scan boundary. Rust additionally validates the fully
rebuilt apply request before retaining materialization: at most 8 MiB and
250,000 JSON nodes across all planned payloads.

### Complete bounded memory response transfer

The shared memory response writer owns headers and body as one ordered byte
sequence. In Zotero it waits for `nsIAsyncOutputStream` readiness, writes at
most 32 KiB, and advances only by the count returned from `write`; a partial
write schedules the remaining suffix instead of dropping it. Node and test
adapters follow the same progress rule. Completion closes the stream only
after every declared byte has been accepted, while abort or a non-progressing
write fails the transfer.

### Preserve failure causality

The endpoint records the body size that was rejected plus the selected limit
before replacing it with a 503 error envelope. Native parses bounded non-200
error envelopes and returns public `response_body_too_large` with
`details.reason = reverse_host_response_too_large`. Plugin RPC errors retain
safe details so the outer request does not become `internal_error`.

Any Host-read, size, decode, or apply-admission failure after preparation calls
discard before returning. Discard is idempotent for recovery purposes, and the
next refresh in the same process must be admitted.

## Risks / Trade-offs

- [The 8 MiB response can increase peak memory] → Only artifact reads receive
  the larger bound; aggregate apply admission runs before retained promotion.
- [Readiness-driven writes create more callbacks for large bodies] → Keep each
  callback bounded at 32 KiB and verify complete framing under forced partial
  writes plus the real Zotero network stack.
- [Native and TypeScript constants can drift] → Add direct parity assertions
  against the shared contract values and boundary fixtures.
- [Detailed debug metadata can accidentally expose content] → Rebuild events
  through an allowlisted sanitizer and reject payload-shaped keys.
- [Bundling the Dashboard can change asset packaging] → Preserve its public
  URL and initialization contract and add production/debug artifact tests.
- [Failure-only production events can duplicate nested and outer failures] →
  Keep both only when they identify different boundaries and correlate them
  with the same request/operation identity.
