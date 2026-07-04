## Overview

Shutdown must prefer process exit over perfect remote cleanup. ACP sessions remain recoverable; local adapters, controllers, timers, listeners, and bridge daemons are released best-effort with fixed timeouts.

## Design

- Introduce a small timeout helper for shutdown paths that resolves with `{ ok, timedOut }` instead of throwing on timeout.
- Add `shutdownAcpWebSocketBridgeService()` to clear the singleton, kill the bridge process, and wait at most 1000 ms for `proc.wait()`.
- Change transport `close()` implementations so cleanup kill/close never awaits unbounded `closed` promises.
- Change ACP Chat shutdown to wrap each slot adapter close in a 2000 ms timeout, then always persist `idle` metadata and clear runtime registries.
- Change ACP Skills shutdown to process controllers concurrently, wrap each disconnect in a 2000 ms timeout, unregister the controller, and persist `closed/available/idle`.
- Change `hooks.onShutdown()` to execute each major cleanup step through a bounded best-effort wrapper and continue after failures or timeouts.

## Failure Handling

- Timeout is recorded as diagnostics/runtime log where the surrounding module already has a logging surface.
- ACP Skill runs are not marked failed solely because shutdown timed out.
- ACP Chat conversations are persisted as local `idle` even if adapter close did not settle.

## Constants

- Transport and bridge close wait: 1000 ms.
- ACP Chat slot detach wait: 2000 ms.
- ACP Skills controller detach wait: 2000 ms.
- Top-level shutdown step wait: fixed per step, no user preference.
