## Overview

Host Bridge becomes a plugin-level supervised service. Startup requests are
best effort and non-blocking; shutdown remains explicit and intentional. The
server module owns the lifecycle state machine so preferences, CLI injection,
and plugin hooks all observe the same status snapshot.

## Lifecycle

- `startHostBridgeSupervisor()` marks Host Bridge as expected to be running,
  starts it in the background, and installs a periodic recovery check.
- `stopHostBridgeSupervisor()` clears scheduled recovery work and closes the
  server without scheduling a restart.
- Unexpected `onStopListening` transitions the service to `stopped`, records a
  recovery reason, and schedules a delayed restart when supervision is enabled.
- Controlled restarts use `restartHostBridgeServer()` so preference changes do
  not look like failures and do not leave the well-known profile stale.

## Port Selection

When `hostBridgePinPortEnabled` is true, startup first attempts
`hostBridgePinnedPort`. Valid pinned ports are `1024..65535`. If binding the
pinned port fails, the server disables the pin preference, records fallback
diagnostics, and continues through the existing random scan range
`26570..26769`.

## Status And UI

`HostBridgeStatusSnapshot` gains stable diagnostics for the ACP panels and
preferences pane:

- `portMode: "random" | "pinned" | "fallback"`
- `pinPortEnabled`
- `pinnedPort`
- `supervised`
- `restartCount`
- `lastRecoveryReason`

ACP Chat and ACP Skills consume this snapshot directly and render a
`host-bridge` indicator. MCP status remains available in diagnostics but is not
rendered as a normal banner indicator.
