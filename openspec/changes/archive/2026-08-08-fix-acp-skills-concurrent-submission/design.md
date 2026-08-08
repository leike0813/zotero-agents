## Context

The Host submission queue already admits two units for a limit of two. The ACP
runner creates and publishes a run record early, then performs registry,
materialization, Host Bridge, dependency, and adapter setup before registering
the live controller. The current controller registration unconditionally writes
`conversationRecoveryState: "connected"`, so it cannot be reused as a setup
handle without changing user-visible recovery semantics.

## Design

### Request-scoped setup lifecycle

Keep the existing live-controller registry semantics and add a separate
module-internal setup handle registry keyed by `requestId`. Register the setup
handle immediately after the run record is created. The handle sets the
orchestrator's cancellation flag and wakes any setup cancellation gate; it does
not write connected or recovery state.

Every setup await boundary checks the cancellation flag. A private cancellation
sentinel lets the orchestrator settle the queue unit as canceled without turning
user cancellation into a failed diagnostic. If adapter creation resolves after
cancellation, the adapter is closed and no ACP session is initialized.

### Identity-safe transition

The setup and live registries use an opaque generation/token. Registering the
live controller invalidates the setup token atomically. Cleanup accepts the
token it acquired and is a no-op when that token is stale. Existing callers that
clear the live controller continue to use their current behavior.

### Diagnostics

Use the existing run event/audit mechanisms. Add a compact stage event at each
stable setup boundary and include existing lineage fields. Transport spawn and
child details are appended only when the existing detailed ACP audit is enabled;
no new backend payload or public Host Bridge field is introduced.

### Scope guard

Do not modify queue admission, native bridge connection ownership, npx launch
leases, ACP adapter method signatures, or Kilo profile isolation. The new
regression harness uses independent fake adapters so a failure identifies the
plugin-side lifecycle independently of Kilo behavior.

## Error and cleanup rules

- Setup cancellation wins over later setup progress and settles exactly once.
- Adapter creation failures remain ordinary terminal failures.
- Setup handle cleanup is idempotent and token-guarded.
- Live cleanup retains current session/recovery state rules.

