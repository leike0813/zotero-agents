## Why

The verified product-owned Synthesis runtime is installable but is not launched
or supervised by the plugin. A launcher without owner, orphan, health, and
crash-loop controls would create an unsafe intermediate topology, while
high-frequency polling would impose a permanent background cost on Zotero's
single-threaded host event loop.

## What Changes

- Add one plugin-owned launcher and supervisor for the packaged Synthesis
  sidecar runtime.
- Add strict profile-scoped lifecycle config, owner, lease, and discovery
  contracts shared by the plugin and Node service.
- Launch only the installer-verified absolute Node and service entrypoint with a
  sealed environment that never resolves PATH, npm, or a user shell.
- Use process exit and host-pipe EOF as primary lifecycle signals, with one
  low-frequency deadline scheduler for lease and health fallback.
- Add authenticated readiness handshake, bounded graceful shutdown, limited
  restart backoff, crash-loop fuse, and explicit recovery.
- Keep stdout and stderr drained without polling or per-chunk state publication.
- Preserve the in-process production Synthesis composition, mutation-disabled
  sidecar, database and canonical-file ownership, and `108 methods / 1 direct
  consumer` inventory.

## Capabilities

### New Capabilities

- `synthesis-sidecar-runtime-supervision`: Defines trusted process launch,
  profile-scoped lifecycle ownership, low-interference monitoring, readiness,
  shutdown, restart, fuse, and recovery behavior.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Adds strict lifecycle identity,
  discovery, host-liveness, and service-side owner/lease behavior.
- `synthesis-sidecar-runtime-packaging`: Requires the installer snapshot to
  expose the verified runtime identity needed by the launcher.
- `runtime-platform-services`: Adds direct product-owned runtime launch with a
  sealed environment and no command or process-control discovery.
- `runtime-persistence-governance`: Adds fixed profile/session lifecycle paths,
  atomic private-file writes, and instance-scoped cleanup.
- `background-refresh-governance`: Governs the sidecar supervisor as a
  service-scoped, low-frequency, single-scheduler background owner.
- `synthesis-invariant-guardrails`: Prevents production routing, Node-in-plugin,
  system-runtime fallback, service descendants, and inventory drift.
- `synthesis-layer-doc-system`: Documents the supervised but still
  mutation-disabled current runtime topology.

## Impact

- New lifecycle contracts under `packages/synthesis-contracts`.
- New Node service lifecycle ownership and host-liveness handling.
- New plugin-side control client and runtime supervisor.
- Runtime installer, persistence primitives, Mozilla Subprocess typing, hooks,
  background timer governance, invariant checks, and Synthesis architecture
  documentation are updated.
- Focused Core 192-194 tests and existing platform, hooks, boundary, persistence,
  and invariant regression gates are updated.
- No dependency, preference, UI, public `SynthesisClient`, database schema,
  domain capability, worker pool, or production owner change.
