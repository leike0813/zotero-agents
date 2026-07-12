## Why

On 2026-07-12, refreshing an `npx`-launched ACP backend cache exercised a transport cleanup path that could terminate the desktop user session. The preceding sequence-lifecycle change bound one supervisor pidfile to one launch and fixed detach timing, but ACP controllers still lack a global, fail-closed boundary that proves real-time process-group ownership before any negative-PID signal.

## What Changes

- Route every local ACP transport and session through one shared controller that owns bounded stdin EOF, graceful exit, escalation, direct fallback, and idempotent close.
- Require launch token, subprocess PID, live PGID, and live SID agreement before POSIX process-group TERM, then revalidate the identity independently before process-group KILL.
- Fail closed to the current subprocess handle when ownership cannot be proven, and expose structured lifecycle diagnostics for incomplete process-tree cleanup without leaking tokens, environment values, credentials, sensitive command lines, or ACP payloads.
- Apply the same controller boundary to ACP Chat, ACP Skills normal and recovered execution, backend probes and cache refresh, adapter diagnostics, and raw-transport diagnostics without backend-, provider-, agent-, command-, or `npx`-specific branches.
- Report platform process-identity-query capability during startup preflight without preventing ordinary ACP startup when group signaling is unavailable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-engine-session-workspace-governance`: Require all local ACP engine/session launches and shutdowns to use the shared transport controller boundary.
- `runtime-platform-services`: Require real-time PID/PGID/SID/launch-token ownership validation and fail-closed escalation semantics for POSIX process groups.
- `acp-chat-session-management`: Require all ACP Chat lifecycle cleanup paths to use the same bounded, idempotent controller close.
- `acp-skillrunner-compatible-runner`: Require normal, recovered, sequence, cancellation, timeout, detach, probe, diagnostic, failure, and shutdown paths to use the shared controller.
- `acp-skills-runtime-options`: Require connection tests and cache refresh to close only their temporary controller and preserve existing engines and desktop-session processes.

## Impact

- Shared ACP transport/controller implementation and platform process-control preflight.
- Native adapter and raw diagnostic launch boundaries while preserving their current `close()` APIs.
- Structured transport lifecycle/audit records and focused controller, adapter, backend probe, ACP Chat, and ACP Skills regression tests.
- No workflow manifest, transcript, workflow result, remote-session recovery, Windows bridge wire protocol, dependency, or user-facing UI contract changes.
