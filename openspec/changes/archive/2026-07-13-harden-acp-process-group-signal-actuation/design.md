## Context

The previous controller hardening introduced EOF-first close, launch-bound PID/token checks, live PID/PGID/SID validation, and TERM-to-KILL revalidation. The Mozilla POSIX actuation step still invoked `kill` as `-TERM -<pgid>`. procps-ng can parse the second negative operand as another option and issue a syscall against a different process group, so correct ownership authorization did not guarantee correct actuation. Wrapper-prone commands such as `npx` reach this path only when they outlive the graceful-close window, explaining the intermittent session exits.

## Goals / Non-Goals

**Goals:**

- Preserve the complete validated PGID through the final signal-delivery boundary.
- Make ownership proof and actuation a single typed process-control contract used by Mozilla and Node transports.
- Fail closed to the directly held child process when safe group delivery cannot be proven or completed.
- Cover every ACP session-launch consumer through the existing shared transport controller.
- Keep cleanup diagnostics structured and non-sensitive.

**Non-Goals:**

- Replacing process groups with a native cross-platform supervisor or cgroup containment.
- Changing ACP protocol, backend configuration, session persistence, or workflow contracts.
- Guaranteeing cleanup of descendants that deliberately escape the controller-owned session.

## Decisions

### Use an opaque validated process-group target

Process-control validation returns a branded `ValidatedPosixProcessGroupTarget` containing the launch-bound PID/PGID/SID. Signal dispatch accepts only this target and a closed `TERM | KILL` signal enum. The validator rejects non-positive identities and PGID values at or below one.

This prevents transport code from validating one numeric identity and later reconstructing another target from an arbitrary PID. A plain utility that only formats numbers was rejected because it would leave authorization and actuation separable.

### Preserve explicit operand boundaries for Mozilla actuation

Mozilla invokes the cached `kill` executable with `-s`, the signal name, `--`, and the complete negative validated PGID as four arguments. The implementation never retries without `--` or with an alternate numeric shorthand. A missing command, spawn failure, or non-zero exit is a failed group actuation.

Node continues to use `process.kill(-pgid, signal)` because it reaches the syscall API directly, but it consumes the same validated target and records the same lifecycle semantics.

### Fail closed without widening the target

Ownership rejection or delivery failure falls back only to the positive child handle already returned by the launch API. The controller records possible wrapper descendants rather than attempting another process-tree mechanism. TERM success remains followed by a fresh ownership validation before KILL.

### Keep the shared controller as the only consumer boundary

Backend cache probes, connection tests, ACP Chat, ACP Skills, sequence stages, recovery, and raw diagnostics already converge on `launchAcpTransport()` directly or through `createAcpConnectionAdapter()`. The implementation changes this boundary and adds coverage assertions instead of patching business modules.

## Risks / Trade-offs

- [The host `kill` implementation does not support `--`] -> Treat the invocation as failed and use the positive child-handle fallback; never attempt an ambiguous spelling.
- [Direct fallback can leave wrapper descendants] -> Record `possibleWrapperDescendants` and preserve safety over aggressive cleanup.
- [A future launch path bypasses the controller] -> Add a source-level invariant and consumer tests around the shared launch boundary.
- [Tests accidentally reproduce the destructive argv] -> Capture Mozilla calls with a fake subprocess; never execute the legacy argument shape against the host utility.

## Migration Plan

1. Land failing regression assertions for the target-preserving argv and typed validator.
2. Move ownership validation and signal invocation construction into process control.
3. Update Mozilla and Node transport escalation to consume validated targets.
4. Run focused controller/probe tests, lint, build, and strict OpenSpec validation.
5. Leave the change active until real Zotero npx cache-refresh, Chat, and Skills teardown are observed without a corresponding user `exit.target`.

Rollback consists of reverting this change as a unit. The legacy ambiguous argv must not be restored; if group actuation must be disabled temporarily, retain EOF plus direct-child cleanup.

## Open Questions

None.
