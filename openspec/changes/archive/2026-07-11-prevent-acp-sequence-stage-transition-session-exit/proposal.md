## Why

On Linux, an ACP sequence workflow can detach the completed step controller while the next step is starting. For wrapper-launched backends this close path may send an insufficiently validated negative-PID signal, creating a severe risk of terminating processes outside the plugin-owned backend tree, including the desktop user session.

## What Changes

- Separate ACP apply-result state recording from controller/transport detachment so state updates have no hidden asynchronous cleanup side effect.
- Make successful non-final ACP sequence-step cleanup an awaited lifecycle barrier after optional step apply and before downstream dispatch, with the same behavior for normal and recovered continuation.
- Require POSIX process-group cleanup targets to match the current transport's supervisor identity before any negative-PID signal is sent; otherwise fall back to direct subprocess cleanup.
- Add structured lifecycle diagnostics and focused regression coverage for cleanup ordering and rejected process-group targets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-runtime`: Require completed non-final ACP sequence steps to settle their owned controller before the next step starts.
- `acp-skillrunner-compatible-runner`: Separate apply-result state transitions from explicit controller detachment and align normal and recovered sequence cleanup.
- `runtime-platform-services`: Require process-group cleanup to validate that the target belongs to the current plugin-owned transport before sending negative-PID signals.

## Impact

- ACP run state and controller lifecycle APIs.
- Sequence execution, step apply, and recovered continuation ordering.
- POSIX Mozilla-subprocess and Node-subprocess cleanup diagnostics.
- Existing ACP transport, sequence runtime, and runtime-memory regression tests.
- No workflow manifest, backend-specific, dependency, or user-facing UI changes.
