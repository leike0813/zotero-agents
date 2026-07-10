## Context

ACP sequence steps currently reuse `markAcpSkillRunApplyResult()` for two unrelated responsibilities: persisting apply state and asynchronously detaching the live controller. A non-final step without `apply_result` therefore starts an unawaited transport close immediately after backend success while the generic sequence loop starts the next step. On POSIX Mozilla transports, wrapper-prone commands use a pidfile plus negative-PID signals, but the pidfile value is not bound to the subprocess instance returned by the current launch.

The change follows the evidence recorded in `artifact/acp-kilo-stage-transition-session-exit-analysis-20260709.md`. It complements, rather than replaces, the cached process-control capability work from `harden-acp-process-cleanup`.

## Goals / Non-Goals

**Goals:**

- Make apply-result persistence free of hidden transport side effects.
- Give the sequence runtime an awaited completion seam between optional step apply and downstream dispatch.
- Use one ACP sequence lifecycle policy for initial and recovered continuation.
- Fail closed before negative-PID signals unless the target is bound to the current transport launch.
- Preserve bounded direct-process cleanup when group cleanup cannot be proven safe.

**Non-Goals:**

- Changing workflow manifests or adding synthetic `apply_result` declarations.
- Adding Kilo-, backend-, provider-, or command-specific sequence behavior.
- Proving which external component requested the observed systemd user-session exit.
- Changing transcript, Assistant Workspace, or workflow result contracts.

## Decisions

### Separate state mutation from controller detach

`markAcpSkillRunApplyResult()` will only persist state. A separate async detach operation will unregister the controller once, append start/completion/error events, and await `disconnect()`. Cleanup failure remains observable but does not rewrite an already settled business result.

Keeping a `detachController` boolean on the state API was rejected because it would preserve the hidden coupling and make call-site ownership difficult to audit.

### Add an awaited sequence-step completion observer

The generic sequence loop will invoke an optional async completion observer after output recording and optional step apply, but before short-circuit return or downstream dispatch. ACP callers use this seam to settle non-final controllers. The observer is generic so the sequence runtime does not import ACP stores or backend-specific policy.

Successful intermediate apply cleanup is deferred to this seam. Failed step apply explicitly settles and detaches before rethrowing because the success seam is not reached. Final steps retain their existing top-level apply ownership unless they declare their own step-level apply.

### Centralize ACP sequence settlement policy

A small workflow-execution lifecycle module will own the distinction between intermediate success, final step-level apply, and failure. Normal execution and recovery orchestration call the same helpers, preventing timing drift between paths.

### Bind POSIX group cleanup to current launch identity

The Mozilla supervisor pidfile will contain both its PID and a random transport token. Group signals require a valid positive subprocess PID, an exact pidfile PID match, an exact token match, and the current `setsid` supervisor strategy. These checks bind the group target to the subprocess handle returned for this launch. Missing or mismatched identity disables negative-PID signaling and falls back to direct subprocess kill.

Node transport group cleanup continues to use the PID returned directly by `spawn()` with `detached: true`; lifecycle diagnostics will identify that launch-bound validation path.

## Risks / Trade-offs

- [Some Mozilla subprocess implementations may not expose a PID] → Treat the group target as unverified and use safe direct cleanup, accepting possible orphaned wrapper children rather than risking unrelated processes.
- [Awaited detach adds latency between steps] → Keep the existing bounded transport grace/kill waits; correctness and process isolation take priority over sub-second transition latency.
- [Cleanup failure could leave a backend process alive] → Persist structured diagnostics and retain direct subprocess fallback without failing a successful workflow result.
- [New observer ordering can affect short-circuit sequences] → Run the completion barrier before both short-circuit return and normal continuation and cover both paths with tests.
