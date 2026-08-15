## Why

ACP Chat replay bypasses the existing `AcpConnectionAdapter` seam and drives
session internals through seven replay-specific entry points on
`acpSessionManager`. Replay state also leaks into ordinary backend refresh,
prune, shutdown, and foreground selection paths.

## What Changes

- Replace replay-specific session-manager entry points with a synthetic
  `AcpConnectionAdapter` owned by the replay target.
- Add a generic scoped adapter-factory registry with backend admission so
  replay targets use the normal `connectAcpConversation` path.
- Add generic ACP Chat `user_message_chunk` transcript handling so replayed
  user turns flow through adapter updates.
- Move replay timer inspection to the synthetic adapter module.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-session-management`: Scoped adapter factories, backend admission,
  and `user_message_chunk` transcript handling.
- `acp-runtime-replay-profiler`: ACP Chat replay targets use the connection
  seam and the synthetic adapter timer inspector.

## Impact

- Removes seven replay write entry points, one replay timer inspector, and
  replay lease state from `acpSessionManager`.
- Adds `src/modules/acpSyntheticConnectionAdapter.ts`.
- Updates `acpRuntimeReplayTargets`, `acpRuntimeReplayIdentity`,
  `acpRuntimeReplayProfiler`, and `acpRuntimeReplayProductionPorts`.
- Adds focused adapter tests and rewrites direct replay tests in the ACP
  session manager lifecycle suite.
- No persistence format or adapter protocol changes.
