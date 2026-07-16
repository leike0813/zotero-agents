## Context

The current v4 path has one publication envelope and one transactional
transcript receiver, but it still reconstructs source-specific panel snapshots.
That reconstruction loses fields, lets local drawer/display state contaminate
canonical publication state, and preserves duplicate owner/scheduler/lifecycle
authorities in the Sidebar and child scripts.

## Decisions

### 1. One strict v5 registry

`ASSISTANT_WORKSPACE_REGION_REGISTRY` is the sole definition of region kind,
scope, wire form, payload, browser state key, managed region, and source
support. The kinds are `owner-navigation`, `service-status`, `owner-control`,
`message-counts`, `transcript`, `plan`, `permission`, `composer`, and
`owner-presentation`. v4 and unknown fields are rejected.

The canonical child state contains `source`, `navigation`, `services`, and one
`selection` object. Selecting another owner atomically replaces the complete
selection, immediately invalidating every region owned by the previous owner.

### 2. One host runtime around two adapters

`assistantWorkspacePublicationRuntime.ts` owns active-source and owner guards,
16 ms intent coalescing, one batch read per owner, signatures, revisions,
delivery, ACK, rebase, lifecycle, owner cleanup, and typed initialization.
Adapters only map source changes and read navigation, owned regions, and
transcript pages.

Initialization publishes navigation and services, then the new empty/loading
selection, then the indexed transcript page, then one batch of the remaining
owned regions. Hidden ACP sources are not read until activated.

### 3. Canonical DTOs do not pass through panel snapshots

Chat emits immutable Workspace changes and reads independent owner/navigation,
plan, transcript, and presentation DTOs. Skills exposes a minimal Workspace read
model and a separate diagnostics DTO. ACP Workspace publication never clones a
full frontend snapshot, run record event history, or panel snapshot.

### 4. One exact browser child

Both child documents use the same data-role DOM and shared JS/CSS. The child
owns canonical state, publication FIFO, ACK, local UI state, action forwarding,
projection, and region rendering. Local UI actions project from canonical state
without writing presentation data back into it. Missing shared modules or bridge
are explicit failures; there is no postMessage or projector fallback.

### 5. Post-owned profiler lifecycle

Only in-window posts create `PublicationLifecycleRecord`. ACK stages append
bounded outcomes to that record, terminal outcome is first-write-wins, and R3
counts derive from the ledger. Correctness counters and lifecycle records are
not capped with metric series; any metric-series drop marks measurement
incomplete.

Replay separates execution/measurement completion from acceptance. Acceptance
owns byte, forbidden-materialization, steady-snapshot, lifecycle, and drift
decisions.

## Migration

The protocol, runtime, Shell, both children, profiler, Replay, tests, and docs
move to v5 atomically. No decoder, alias, dual write, or historical matrix
compatibility is retained. Repository history is the rollback mechanism.

## Risks

- Owner-first initialization may expose incomplete presentation briefly.
  Loading is therefore part of the new owner selection and is published before
  asynchronous page/region reads.
- A shared child can accidentally erase source semantics. The registry and
  exact projector keep source applicability explicit while preserving one state
  shape.
- Lifecycle diagnostics can grow without the metric cap. Records remain bounded
  to the active profile window and retain only bounded stage codes.

## Open Questions

None. The breaking protocol, state shape, owner reset, runtime boundary,
presentation semantics, and acceptance rules are fixed by this change.
