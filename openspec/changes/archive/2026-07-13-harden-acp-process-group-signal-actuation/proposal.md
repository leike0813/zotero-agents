## Why

The ACP controller currently validates the intended POSIX process group but the Mozilla signal-delivery helper passes a negative PGID to `kill` without an option terminator. On procps-ng this can reinterpret the PGID as an option and signal a different process group, including the user session; EOF-first cleanup only makes the defect intermittent when wrapper-based backends such as `npx` fail to exit during the grace period.

## What Changes

- Split process-tree cleanup safety into ownership authorization and signal-target actuation guarantees.
- Make validated POSIX process-group targets opaque and consumable only by the shared signal-delivery boundary.
- Require Mozilla group signals to use an explicit option terminator and preserve the complete validated PGID; retain direct Node signaling behind the same validated target contract.
- Fail closed to the direct child handle when validation or signal delivery fails, without retrying an ambiguous negative-PID spelling.
- Cover cache refresh, ACP Chat, ACP Skills, probes, and diagnostics through the existing shared ACP controller instead of adding consumer-specific cleanup logic.
- Add structured lifecycle diagnostics and regression tests for full-PGID preservation, escalation, revalidation, and idempotent close.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-platform-services`: Require POSIX process-group signal actuation to preserve the validated target and fail closed on unsupported or failed delivery.
- `acp-engine-session-workspace-governance`: Require every ACP launch/close path to use the shared controller's validated termination boundary.
- `acp-chat-session-management`: Require ACP Chat teardown to inherit the shared controller's target-preserving cleanup.
- `acp-skillrunner-compatible-runner`: Require ACP Skills and sequence teardown to inherit the same cleanup boundary.
- `acp-skills-runtime-options`: Require backend connection tests and runtime-options cache probes to close through the same controller boundary.

## Impact

- Affects the shared ACP transport and runtime process-control modules plus their focused tests.
- Does not change user-facing backend configuration, ACP protocol messages, persisted session formats, or public workflow contracts.
- Adds no dependency and preserves the existing EOF-first, TERM, revalidation, KILL, and direct-child fallback sequence.
