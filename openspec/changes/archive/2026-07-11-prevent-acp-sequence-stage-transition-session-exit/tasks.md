## 1. Lifecycle Regression Tests

- [x] 1.1 Update ACP run-store tests to require side-effect-free apply-state recording and explicit awaited detach.
- [x] 1.2 Add sequence-runtime tests for the post-apply cleanup barrier before downstream dispatch and short-circuit return.
- [x] 1.3 Add transport tests for accepted supervisor identity and safe fallback on PID, token, or signal failure.

## 2. ACP Controller Lifecycle

- [x] 2.1 Split apply-result state recording from exported asynchronous controller detach with structured events and idempotent ownership.
- [x] 2.2 Add the generic awaited sequence-step completion observer and centralized ACP sequence settlement policy.
- [x] 2.3 Wire normal execution, step apply, top-level apply, and recovered continuation to the explicit lifecycle APIs.

## 3. POSIX Process Cleanup Safety

- [x] 3.1 Bind Mozilla supervisor pidfiles to a transport token and the subprocess PID returned by the current launch.
- [x] 3.2 Reject unverified negative-PID cleanup and fall back to bounded direct subprocess termination with diagnostics.
- [x] 3.3 Preserve launch-bound Node process-group cleanup and expose consistent validation lifecycle state.

## 4. Validation

- [x] 4.1 Run focused ACP transport, sequence runtime, and runtime-memory tests.
- [x] 4.2 Run TypeScript, formatting, lint, and core Node regression checks.
- [x] 4.3 Run strict OpenSpec validation and confirm all tasks are complete.
