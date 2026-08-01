## Context

The current v1 diagnostic event couples three concerns: protocol tracing,
failure persistence, and Dashboard rendering. Failures from several nested
boundaries each append Runtime Log entries, while debug state is split between
a startup snapshot and a copied flat array. Rust writes failure diagnostics in
normal execution and the supervisor always drains diagnostic tails.

## Goals / Non-Goals

**Goals:**

- Keep Runtime Log focused on user-visible Host business operations.
- Provide a complete, causal, payload-free trace in debug builds.
- Make the disabled path predictable and removable from production bundles.
- Use one strict contract and one in-memory trace store.

**Non-Goals:**

- Fix Advanced Matching policy or persistence behavior.
- Add public APIs, persist debug data, collect CPU/memory histograms, or trace
  database functions.
- Change Synthesis database, canonical storage, or release identities.

## Decisions

### 1. Separate the business and debug planes

`synthesisSidecarBusinessAudit.ts` is the only Synthesis path that writes
business incidents. Mutations record start and terminal entries. Reads and
periodic calls remain silent unless they fail. A per-invocation audit handle
owns terminalization, so nested transport/worker failures cannot create a
second incident.

Runtime Log keeps its current schema. Details are restricted to operation,
trigger, stage, outcome, duration, a Host-normalized classification, and a
public semantic status. HTTP status, byte counts, native/worker request IDs,
worker codes, and trace fields are excluded.

### 2. Use one strict v2 contract

`synthesis-sidecar-observation.v2` has exact-field rebuilding for trace context
and events. Events contain trace/span ancestry, span-local attempt, source,
boundary, phase, outcome, stable code, allowlisted identities, metrics, and
domain facts. Unknown fields fail closed. Zero counts remain present.

No raw payload, title, body, locator, identifier value, path, credential, or
free-form error text is accepted. Facts and metrics use closed key sets;
Advanced Matching contributes only matching hash and aggregate counts.

### 3. Gate before constructing or reading diagnostics

The Host checks one predictable debug gate at each observed boundary. When it
is closed, it creates no trace IDs or events and serializes no wire context.
The supervisor does not parse stderr as NDJSON, retain process tails, publish
diagnostic subscriptions, or refresh the sidecar tab. Rust uses the launch
debug flag to avoid serializing structured diagnostics; business failure
continues through RPC results and supervisor process state.

### 4. Propagate optional trace context only on debug wire

Host RPC requests may carry a strict optional trace context. Rust establishes
that context for the request and creates child spans for dispatch, reverse
Host, workers, transfers, and durable operations. Reverse-Host requests carry
the same optional context. The field is absent when debug is disabled.

### 5. Keep bounded traces, not a flat event cache

The in-process store retains at most 1,000 events and 128 events per trace.
Active traces are pinned. Capacity pressure evicts the oldest completed trace
as a unit. Per-trace overflow preserves the start, first failure, and terminal
event and increments a dropped count. Subscribers receive `added`, `updated`,
and `evicted` patches in a 200 ms batch; snapshots are read only when the tab
opens.

### 6. Render incrementally

The Dashboard groups events by trace and shows span ancestry, attempt, stable
outcome/code, dropped counts, allowlisted metrics, and facts. Applying a patch
updates only affected traces and retains selected trace, scroll position, and
unchanged DOM rows. Copy exports the complete sanitized selected trace.

## Risks / Trade-offs

- Optional debug context changes an internal wire envelope. Strict TypeScript
  and Rust corpus parity prevents drift.
- A bounded in-memory trace can drop detail during a storm. Preserving causal
  endpoints and the first failure retains the useful diagnosis while keeping a
  deterministic budget.
- Host semantic-status classification is intentionally small and manifest
  driven; unknown result shapes remain successful transport outcomes unless
  an operation explicitly declares a status field and accepted values.

## Migration

The v1 event and startup snapshot are not persisted and receive no compatibility
adapter. Callers move directly to v2. The generic observability material in
`stabilize-synthesis-r9a-retirement-baseline` moves here; its existing Advanced
Matching implementation remains untouched and can be fixed under a later
change after trace evidence is available.
