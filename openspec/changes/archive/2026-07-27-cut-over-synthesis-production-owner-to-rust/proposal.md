## Why

R8 has produced a locally verified Rust native runtime, durable/application parity, and bounded worker execution, but production `SynthesisClient`, `synthesis.db`, Topic canonical files, Host effects, and mutation admission still belong to the plugin-side legacy composition. R9a must make Rust the only production writer through one auditable cutover without introducing a long-lived dual stack or a request-level fallback.

## What Changes

- Add a complete typed native RPC adapter for the existing grouped `SynthesisClient` surface while preserving its 96 public methods and DTOs. The closed remotely dispatched production inventory contains 95 operations; stale 108-method planning references are corrected rather than filled with invented methods.
- Add a plugin-owned, authenticated reverse-Host transport for the bounded Zotero reads, WebDAV/export delivery, and preconditioned Host effects required by native applications.
- Add an upgrade-triggered cutover coordinator that drains legacy work, creates and verifies a production backup, dry-runs the native owner, transfers the owner lock, records a durable receipt, validates critical reads, and only then enables mutations.
- Change the default production client from the legacy in-process composition to the verified native composition. Missing, incomplete, stale, or incompatible native state fails closed and never falls back per request.
- Execute the 95-operation migration through seven domain-owned surface changes and one final activation change. `operation-ownership.json` is the unique planning source for operation assignment; the final activation change requires every domain gate.
- Keep Node and legacy source as a differential/migration oracle for this change, but make it unreachable from the production import graph. Physical deletion remains R9b.
- Treat missing R8 five-platform remote evidence as a recorded external acceptance debt. This change does not dispatch, publish, sign, synchronize, or claim complete R9/Stage 1 release acceptance.

## Capabilities

### New Capabilities

- `synthesis-native-production-routing`: Complete typed native `SynthesisClient` routing, capability completeness, mutation admission, and bounded reverse-Host transport.
- `synthesis-production-owner-cutover`: Upgrade-triggered single-writer transfer, backup/dry-run/receipt protocol, recovery rules, and post-cutover ownership invariants.

### Modified Capabilities

- `synthesis-client-foundation`: Production composition changes from legacy in-process ownership to fail-closed native routing while the public client remains stable.
- `synthesis-default-client-lifecycle`: Generation acquisition, invalidation, shutdown, and unavailable/incompatible behavior become native-owner scoped.
- `synthesis-sidecar-service-boundary`: The native service changes from a mutation-disabled shadow to the only production DB/canonical owner with explicit reverse-Host boundaries.
- `synthesis-host-bridge-client-consumer`: Complete-service access is no longer confined to legacy composition; Host Bridge remains a grouped client consumer of the native production route.
- `synthesis-workflow-client`: Production workflow behavior moves from the in-process adapter to the same native grouped client and Host ports.
- `synthesis-rust-sidecar-migration-governance`: R9a may start with R8 remote evidence deferred, but cannot claim release acceptance and must preserve the separate R9b deletion boundary.
- `synthesis-rust-durable-foundation-parity`: The accepted isolated durable implementation becomes eligible for an atomic production-owner transfer with no shared live roots.

## Impact

- Acts as the R9a program change. Domain implementation and operation-level evidence are owned by the eight linked child changes, while this change retains the final cross-cutting production contract and completion state.
- Affects language-neutral sidecar lifecycle/RPC/Host/cutover contracts, the Rust service/application composition, plugin runtime supervision and default-client composition, production persistence ownership, and existing Synthesis integration tests.
- Does not change the public `SynthesisClient`, Host Bridge/MCP capability names, workflow-facing DTOs, Zotero ownership of library data/secrets, or runtime distribution policy.
- Adds no Node fallback, backend/provider registration, arbitrary method dispatch, direct Rust access to Zotero DB, or R9b deletion.
