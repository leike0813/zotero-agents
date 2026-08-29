## Context

The sidecar exposes general, system, and compute capabilities through one
authenticated `/synthesis/v1/call` endpoint. Its request reader currently owns
one 1 MiB limit and generic JSON structural limits, so the Citation Graph
layout canary rejects ordinary graph DTOs before the engine's own 5,000-node and
20,000-edge bounds are reached. The internal compute client also has no byte
preflight or response-size guard.

This change must increase useful compute capacity without creating an unbounded
parser, changing worker topology, or implying that every theoretical
engine-valid string combination can cross HTTP. Production layout remains
in-process until a later routing change.

## Goals / Non-Goals

**Goals:**

- Establish 8 MiB UTF-8 request and response envelopes for compute calls while
  preserving 1 MiB general/system envelopes.
- Enforce byte and structure limits at the earliest available client, HTTP,
  parser, response, and client-read boundaries.
- Stop oversized or disconnected requests before they consume worker capacity.
- Keep result-size failures outside worker crash/restart/degradation accounting.
- Make the wire bound a contracts-owned, documented, testable product boundary.

**Non-Goals:**

- Guarantee transport for every 5,000-node/20,000-edge DTO at theoretical
  maximum string lengths.
- Route production Citation Graph layout or any other engine to the sidecar.
- Add compression, streaming, temporary files, endpoints, dependencies,
  preferences, persistent jobs, mutation authority, or runtime prebuilds.

## Decisions

### Contracts own capability-specific byte and structure limits

The shared contracts package defines 1 MiB general/system and 8 MiB compute
envelope limits as exact UTF-8 byte counts. Compute requests allow 250,000 JSON
structural nodes; compute results retain 50,000. JSON depth 32, string 64 KiB,
and engine DTO bounds remain unchanged.

The 250,000 request limit covers the roughly 205,000 structural validator nodes
of a maximum-count layout request. Byte size remains an independent bound, so
large identifiers can still reject an otherwise engine-valid DTO.

### One endpoint uses an absolute reader cap followed by capability enforcement

The server cannot know the capability until it parses the call envelope. The
body reader therefore uses the 8 MiB absolute endpoint cap, checks a valid
`Content-Length` before reading, and stops a chunked request as soon as
accumulated bytes exceed the cap. After parsing the capability, general/system
calls larger than 1 MiB are rejected while compute calls use 8 MiB.

Creating a second endpoint or scanning a partial JSON stream for capability was
rejected because either duplicates authentication/dispatch or creates a fragile
pre-parser. Raising every capability to 8 MiB was rejected because it weakens
unrelated control-plane bounds.

### The compute client and server enforce symmetric serialized envelopes

The compute client serializes once, measures UTF-8 bytes, and rejects an
oversized request before opening HTTP. The server serializes a successful
compute response once and checks the complete response envelope before writing.
The client caps incoming response bytes before JSON parsing. Request overflow is
`request_body_too_large` with HTTP 413; result/response overflow is
`response_body_too_large` with HTTP 502.

The server error envelope itself remains small. Result overflow is transport
failure rather than worker runtime failure and MUST NOT increment worker
failure/restart counters or trip the degraded fuse.

### Existing JSON and worker protocols remain intact

The server still parses a complete JSON envelope, strictly rebuilds the layout
request, and sends it to the worker by structured clone. The worker and main
thread continue strict result rebuilds. Gzip was rejected because decompression
needs a second limit and introduces compression-ratio abuse; NDJSON, streaming,
and temporary files were rejected because they expand protocol, authority, and
lifecycle scope without being needed for the chosen 8 MiB boundary.

### Abort applies during body collection and existing scheduling

Request close/abort removes listeners, stops buffering, and prevents parse or
dispatch. Once a compute task is enqueued, existing pool cancellation remains
authoritative. Oversized requests are rejected before enqueue and therefore do
not spawn the lazy worker or consume the one-active/two-queued budget.

## Risks / Trade-offs

- [JSON parsing temporarily holds bytes, string, and object graph] → Keep the
  envelope at 8 MiB, one worker, two queued tasks, strict structure limits, and
  existing V8 resource bounds.
- [The shared endpoint must read up to 8 MiB before identifying a non-compute
  call] → Retain post-parse 1 MiB enforcement and reject `Content-Length` above
  the absolute 8 MiB cap before allocation.
- [An engine-valid DTO can still exceed 8 MiB] → Document wire and calculation
  bounds independently and fail without truncation or fallback.
- [Result estimates may change with DTO evolution] → Enforce the full response
  envelope in both server and client and include limit constants in contract
  and packaging/fingerprint regression checks.

## Migration Plan

1. Add contracts and failing Core tests for byte, structure, abort, response,
   scheduling, and production-ownership behavior.
2. Parameterize request collection/validation and implement server response
   enforcement.
3. Add compute-client request preflight and bounded response reading.
4. Update governance and current-state documentation.
5. Run focused/full repository and strict OpenSpec validation.

Rollback restores the generic 1 MiB compute limit and removes the additional
error/limit constants. No data migration, production routing rollback, or
runtime release action is required.

## Open Questions

None. Production routing remains deferred to
`route-synthesis-citation-graph-layout-through-sidecar-worker`.
