## Context

Citation Graph Build currently has a direct engine and a real HTTP/worker canary, but both request and result cross the sidecar as a single JSON value. The baseline measured a 24.9 MiB normal request, a 71.7 MiB normal result, and substantially larger target/stress cases; the normal worker path also spent more than five seconds in strict result reconstruction. The sidecar wire remains intentionally bounded to 8 MiB per compute call, and the worker must not access the plugin database, canonical files, Host capabilities, Zotero globals, or child processes.

The next architectural step is therefore a service-owned transfer session, not a larger monolithic body. The plugin still owns Host capture, request basis, basis recapture, and database promotion. A later change will consume the staged input through a packed worker representation and publish staged output.

## Goals / Non-Goals

**Goals:**

- Transfer graph-build input and output as independently bounded, strictly validated pages.
- Make retries deterministic and idempotent with canonical manifests and SHA-256 identities.
- Keep memory, disk, session count, lifetime, health reporting, and shutdown behavior bounded.
- Reuse Citation Graph Build DTO validation without invoking the full semantic result rebuild at every page boundary.
- Exercise the contract over real authenticated HTTP while preserving production routing and ownership.

**Non-Goals:**

- Execute normal, target, or stress graph builds in a worker.
- Define packed worker memory layout, transferables, SharedArrayBuffer, or production streaming promotion.
- Route public `SynthesisClient`, Workbench, Host Bridge, or MCP calls through the transfer capability.
- Move database, canonical-file, Host-read, basis, operation, or promotion ownership into the service.

## Decisions

### One authenticated capability owns a discriminated session protocol

The service advertises `compute.citation_graph_build_transfer`. Its payload is a strict union over `begin`, `put_input_page`, `seal_input`, `status`, `get_output_manifest`, `get_output_page`, and `cancel`. Keeping one capability preserves capability parity and authentication while avoiding a family of independently drifting endpoints. It is a compute-related control capability but does not enqueue the compute worker in this change.

### Canonical JSON rows are the HTTP staging format

Input kinds are `library_nodes` and `references`. Output kinds are `nodes`, `resolved_edges`, `aggregate_edges`, `source_ownership`, `incoming_groups`, and `light_metrics`. Each page contains one homogeneous row array and uses `canonical_json_rows.v1`. This format reuses existing DTOs, keeps each JSON parse bounded, and defers packed binary concerns to the worker-integration change.

Each manifest uses `synthesis-citation-graph-build-transfer.v1`, contains a strict direction-specific header, a complete ordered list of page descriptors, and a root hash. A page descriptor contains kind, zero-based page index, row count, canonical byte length, and SHA-256. Page hashes cover canonical JSON UTF-8 bytes. Root hashes cover the canonical manifest body with descriptors sorted by fixed kind order and page index. The service never trusts client-supplied count, size, order, or digest without recomputing it.

### Engine owns row truth; transfer layers own envelopes

The synthesis-engine exports strict structural row/page rebuilders for all input and output kinds. The full request/result rebuilders retain their existing semantic guarantees and public behavior. Runtime page upload and output retrieval use only structural page rebuilders plus manifest hashes; a direct-engine oracle test proves that assembling valid pages preserves graph-build semantics. This removes repeated full-graph recomputation from transfer boundaries without copying DTO definitions.

The synthesis-contracts package owns session actions, manifests, snapshots, limits, and errors. The Node service owns filesystem state and timers. The plugin-side transfer client strictly rebuilds all responses.

### Sessions are ephemeral, bounded, and not recovered

The service permits at most two active sessions and 2 GiB staged bytes globally. Each direction permits at most 256 pages and 1 GiB; each canonical page permits 4 MiB and 100k JSON nodes. Sessions expire after five idle minutes or thirty absolute minutes. A thirty-second reaper removes expired state.

`begin` accepts a bounded idempotency key. Repeating the key with the same input manifest returns the same session; changing the manifest returns `transfer_conflict`. Pages may arrive out of order. Repeating an identical page is a no-op; changing a declared page conflicts. Seal succeeds only when every descriptor and the manifest root match.

The in-memory state machine is `receiving_input`, `input_sealed`, `publishing_output`, or `completed`. Output publication methods are service-internal in this change. Canceled and expired sessions are removed from the addressable map and subsequently return `transfer_not_found`.

### Filesystem retirement is constant-time on control paths

Session files live below the current supervisor session at `citation-graph-transfers/`, with `0700` directories, `0600` files, generated UUID path components, and atomic temporary-file rename. Cancel, expiry, and shutdown first rename a session/root to a tombstone and update in-memory counters, then delete best-effort. Startup retires and removes tombstones for the current supervisor and never recovers staged sessions. This keeps shutdown responsive even when staged data is large.

Health and handshake expose only an O(1) snapshot: state, session count, and staged bytes. They never scan directories or manifests.

### RPC mechanics are shared, production composition is not

An internal sidecar RPC transport centralizes bearer authentication, request identity, service-instance identity, response limits, stable error parsing, deadline, and AbortSignal behavior. Existing compute calls and the new transfer client use it. The transfer client is not exported through the public Synthesis client composition.

## Risks / Trade-offs

- **JSON rows use more disk and CPU than a packed representation.** → Bound every page and make the next change consume pages through a packed worker format without changing this HTTP contract.
- **A client can reserve manifest capacity without uploading pages.** → Limit sessions and staged bytes, apply idle/absolute TTLs, and make `transfer_busy` retryable.
- **A process can die after writing a page but before responding.** → Identify pages by descriptor/hash and make identical retries idempotent.
- **Best-effort deletion can leave large tombstones.** → Remove addressability by rename immediately and retry cleanup on the reaper and next service startup.
- **Structural output validation does not prove cross-page semantics.** → Keep semantic validation in the direct oracle and future compute producer; do not present staged output as production-promotable in this change.

## Migration Plan

1. Add contracts and engine page rebuilders without changing current compute routes.
2. Add the transfer owner, authenticated dispatch, and internal client behind the new capability.
3. Add runtime bundle/fingerprint assertions, governance, and documentation.
4. Validate a real HTTP staging canary and preserve the existing in-process production graph-build route.

Rollback removes the advertised transfer capability and staging owner; no durable or production data migration is required because sessions are ephemeral.

## Open Questions

None for this change. Packed worker layout and production streaming promotion are intentionally separate changes.
