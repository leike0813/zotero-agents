## Overview

ACP skill execution will synthesize effective runtime options locally, mirroring SkillRunner's backend behavior: runner defaults first, request payload runtime options second, submit-time provider runtime options third, and system defaults only as fallback for still-missing values. The only option introduced by this change is `hard_timeout_seconds`.

The timeout implementation remains outside the ACP skill run state machine. It guards the active local ACP connection or turn, disconnects locally on expiry, and leaves the remote session recoverable through existing reconnect paths.

## Decisions

- Use `1200` seconds as the fallback timeout when submit-time provider runtime options, request payload runtime options, and runner defaults do not provide a valid positive integer.
- Preserve `request.runtime_options` as the submitted request payload; do not write synthesized defaults back into the request.
- Treat submit-time provider runtime options as execution-context overrides over same-named runtime options already compiled into the request payload.
- Treat timeout as a local disconnect, not a failure or cancellation.
- Use the existing provider option schema renderer for UI. ACP gains the same `hard_timeout_seconds` provider option key and label as SkillRunner.

## Execution Semantics

- Auto execution starts one timeout window when ACP prompting begins and clears it on terminal completion, disconnect, cleanup, or error cleanup.
- Interactive execution starts a timeout window for each agent prompt turn. When the run enters `waiting_user`, the timer is cleared. When a user reply starts a new prompt turn, the timer is started again.
- Recovered sessions recompute effective runtime options from the stored request and runner metadata, then apply the same per-turn timeout behavior.

## Failure Handling

When the timer expires, the runner records `hard-timeout-disconnect-requested`, attempts to cancel the active ACP prompt if a session exists, and closes the local adapter through the existing disconnect cleanup. Cancel failures are non-fatal and should not prevent local cleanup.
