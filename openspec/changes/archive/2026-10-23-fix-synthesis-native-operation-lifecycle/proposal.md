# Proposal

## Why

Native capability calls currently start their transport deadline after input staging, and composition invalidation does not stop in-flight local work. A stale call can therefore dispatch a mutation after disposal or receive a fresh full budget after staging has exhausted its intended window.

## What Changes

- Own each native capability invocation from preparation through staging, RPC, output validation, and bounded transfer cleanup.
- Synchronously cancel local waits on invalidation and expose one idempotent disposal drain barrier for that composition only.
- Share the manifest transport budget across all business phases; never dispatch the next phase after expiry or cancellation.
- Consolidate duplicate input transfer staging and propagate cancellation through output reads without weakening validation.
- Keep transfer cleanup independently bounded and preserve Rust durable maintenance identity, execution, terminal state, and recovery.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-default-client-lifecycle`: Specify in-flight native cancellation, owner-scoped drain, and stale-generation isolation.
- `synthesis-native-production-routing`: Specify a single native capability transport budget, independent transfer cleanup, and the distinction between local cancellation and durable maintenance control.

## Impact

Changes are confined to native composition, output transfer consumption, their existing lifecycle/route test seams, and lifecycle documentation. Existing default-client coordination and production RPC cancellation are reused. No public client error code, manifest deadline, transport grace, Rust protocol, dependency, plugin build, release, or durable maintenance behavior changes.
