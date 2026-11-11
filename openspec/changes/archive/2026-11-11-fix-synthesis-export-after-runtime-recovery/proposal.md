# Proposal

## Why

After a sidecar automatically recovers, ordinary reads can use its current connection while filtered artifact export still contacts a departed endpoint. The resulting transfer failure becomes a generic `internal`/503 and loses its safe cause in business logs; existing recovery and export tests do not exercise this production composition.

## What Changes

- Follow the supervisor's current ready instance for owner readiness, Reverse Host binding, and export content transfer; fence late initialization and shutdown.
- Preserve safe transport and sidecar failure reasons across RPC, transfer, Reverse Host, and business audit boundaries without changing public request/result schemas or replaying dispatched operations.
- Extend existing owner, production export, and Zotero SL-01 recovery tests to cover automatic replacement followed by default-path export.
- Document the production boundaries each test exercises and the limits of fixture-based coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-runtime-supervision`: owner readiness and export connections follow automatic replacements even when no caller observes the unavailable interval.
- `synthesis-sidecar-debug-observability`: safe availability causes survive transfer adapters and reach the existing business failure summary.

## Impact

TypeScript production owner, RPC/transfer clients, native composition, and business audit; existing Synthesis Node/native tests and System E2E SL-01; runtime supervision and testing documentation. No dependencies, Rust protocol changes, user-data migrations, release actions, or Git commits.
