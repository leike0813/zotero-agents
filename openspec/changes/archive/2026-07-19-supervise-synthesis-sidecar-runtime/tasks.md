## 1. Contracts and Tests

- [x] 1.1 Add Core 192 lifecycle contract, owner, discovery, config deletion, host-pipe EOF, and lease-expiry tests.
- [x] 1.2 Extend Core 193 to require verified bundle, Node, service, and protocol identity from installer snapshots.
- [x] 1.3 Add Core 194 launcher, readiness, low-frequency scheduler, restart, fuse, diagnostics, and shutdown tests.

## 2. Shared Lifecycle and Persistence

- [x] 2.1 Add strict environment-neutral sidecar lifecycle DTOs and exports.
- [x] 2.2 Add profile/session runtime paths, private atomic file writes, and identity-scoped lifecycle cleanup primitives.
- [x] 2.3 Extend runtime installer snapshots with verified manifest identity.

## 3. Node Service Lifecycle

- [x] 3.1 Extend service config and handshake identity for supervised launches.
- [x] 3.2 Implement service-owned runtime-instance lock, stale-owner recovery, and atomic discovery.
- [x] 3.3 Implement secret config deletion, stdin EOF shutdown, low-frequency lease expiry, and matching cleanup.
- [x] 3.4 Preserve fail-fast, loopback-only, mutation-disabled, and no-descendant service boundaries.

## 4. Plugin Supervisor

- [x] 4.1 Add a bounded internal sidecar health/handshake/shutdown control client.
- [x] 4.2 Implement verified absolute launch, sealed environment, and continuous bounded stdout/stderr drain.
- [x] 4.3 Implement the single deadline scheduler, 30-second lease, 60-second health, suspend grace, and state-change-only snapshots.
- [x] 4.4 Implement bounded restart, five-minute reset, crash-loop fuse, explicit recovery, and bounded shutdown.
- [x] 4.5 Connect non-blocking plugin startup and bounded plugin shutdown without changing production client routing.

## 5. Governance and Documentation

- [x] 5.1 Update background refresh, runtime platform, persistence, hooks, boundary, inventory, and invariant regression guards.
- [x] 5.2 Update current-state Synthesis runtime and packaging documentation.
- [x] 5.3 Run focused tests, TypeScript, service boundary/build, invariants, formatting/lint checks, help-doc check, production build, diff check, and strict OpenSpec validation.
