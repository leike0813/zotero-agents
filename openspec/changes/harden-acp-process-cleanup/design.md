## Overview

The fix adds a platform-owned process-control snapshot that is initialized by
startup preflight and then consumed by ACP transports. The snapshot describes
what cleanup strategy is available; it does not resolve commands, rebuild launch
plans, or read ACP stdout.

## Platform Preflight

`preflightRuntimeProcessControlOnStartup()` lives in the platform layer and
returns a cached `RuntimeProcessControlSnapshot`:

- `initialized`, `initializedAt`, `platform`
- `preferredCleanupStrategy`
- `supportsProcessTreeCleanup`
- `supportsProcessGroupLaunch`
- `supportsNegativePidSignal`
- `supportsPidFileSupervisor`
- `diagnostics`

The startup hook runs command/env preflight first, then full command registry
preflight, then process-control preflight. Each stage appends one `info` runtime
log with bounded, sanitized summary details. Logs must not include full PATH,
full env, tokens, or full command lines.

## Transport Integration

ACP transport launch continues to build its command through the existing runtime
command services and `buildAcpLaunchPlanForTests()`. Process-control code only
wraps final launch/cleanup metadata where supported.

For this change, the transport close path consumes the cached snapshot and
records cleanup diagnostics in the lifecycle. Unsupported platforms degrade to
direct kill with `processTreeCleanupSupported=false` and
`processTreeCleanupStrategy="direct-kill-only"`. Wrapper-prone commands such as
`uv`, `npx`, and shell wrappers are explicitly marked in lifecycle diagnostics so
leak risk is visible.

## Stdout Boundary

The ACP protocol reader remains the only semantic owner of child stdout.
Process-control detection and supervisor metadata must never write PID, ready, or
diagnostic content to child stdout. Any future supervisor must use side-channel
metadata such as a pidfile/control file or bridge control frames, not the ACP
stdout stream.

## Rollout

This is a local runtime behavior change with no user-facing schema migration.
If a platform cannot support process tree cleanup, plugin startup continues and
runtime logs/lifecycle diagnostics identify the degraded cleanup mode.
