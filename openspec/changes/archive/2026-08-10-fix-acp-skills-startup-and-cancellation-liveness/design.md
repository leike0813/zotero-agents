## Context

ACP Skills startup spans managed npx acquisition, transport launch, ACP initialize, session new/load/resume, and initial mode/model/configuration. These operations currently have separate ownership paths and some are unbounded. The run store installs a live controller as soon as the adapter object exists, which makes `connected` mean “adapter allocated” instead of “session usable.” Closing before transport assignment also leaves late resources outside the controller's ownership.

Task cancellation has the inverse ordering problem: it awaits controller cleanup before committing `canceled`. Sequence and workflow seams primarily follow the provider promise, so a backend that never returns can prevent the already-known ACP terminal state from releasing Host admission.

## Goals / Non-Goals

**Goals:**

- Give every startup phase an independent 60-second limit and one cancellation contract.
- Make session readiness the only transition to `connected`.
- Make cancellation terminal publication and Host settlement independent of backend cooperation.
- Preserve recoverable disconnect semantics.
- Make ACP terminal state authoritative across sequence and workflow seams.

**Non-Goals:**

- Do not add backend-, provider-, agent-, or command-name special cases.
- Do not alter workflow manifests, persisted run records, the ACP protocol, or prompt hard-timeout semantics.
- Do not change duplicate admission rules; correct lifecycle settlement removes stale identity naturally.
- Do not make cold startup timeout configurable in this change.

## Decisions

### Decision 1: One reusable bounded wait primitive

`src/utils/wait.ts` will expose a typed bounded wait result that distinguishes resolved, rejected, timed out, and canceled outcomes. It clears timer/listener resources and attaches handlers to the source promise so a late settlement cannot produce an unhandled rejection. Callers retain responsibility for disposing any late resource value.

Each startup phase creates a fresh 60-second wait. The timeout error carries the structured phase name and timeout value. Prompt hard timeout still begins only after prompt readiness.

### Decision 2: Adapter owns a permanent close signal

The connection adapter creates its close signal before acquiring a lease or transport. `close()` aborts this signal first, then cleans up resources already assigned. Every awaited acquisition rechecks the signal before transferring ownership. If a transport or lease arrives late, the completion handler disposes it immediately.

Windows WebSocket bridge launch receives the same signal and startup timeout. Cancel or timeout closes the socket while waiting for `spawned`; a late acknowledgment or child cannot revive the transport.

### Decision 3: Setup and live controllers are distinct

The orchestrator registers a setup controller while startup is in flight. That controller only cancels setup and closes owned resources; it does not publish `connected`. After initialize, session attachment, and initial runtime selection all succeed, the run store atomically replaces the setup controller by identity and publishes `connected`.

Recovery reuses the same setup gate. Cancellation or timeout winning the race prevents a late startup result from sending a prompt, reinstalling a controller, or overwriting terminal state.

### Decision 4: Terminal publication precedes cleanup

Task cancel synchronously records `canceled`, cancels pending resumption, propagates sequence terminal state, and notifies terminal observers. Controller cancel and adapter close then run under the existing two-second cleanup watchdog. Cleanup timeout is diagnostic only.

Disconnect remains non-terminal and preserves recoverable remote identity, but local detachment is bounded by the same watchdog. Controller unregister operations compare identity so stale cleanup cannot remove a newer controller.

### Decision 5: Terminal run records outrank pending provider promises

Sequence runtime propagates an ACP step's recorded `failed` or `canceled` state to the current step and parent and stops downstream execution. Error classification is provider-aware; ACP terminal records never enter the SkillRunner observer-failure recovery branch.

Terminal observer and apply seams check explicit ACP/sequence terminal facts even while the local job is still `running`. Apply is skipped and a matching canceled/failed outcome is emitted. Existing Host queue settlement remains the exactly-once owner for slot and identity release.

## Risks / Trade-offs

- A first managed npx install may legitimately exceed 60 seconds. The run will fail with the precise startup phase and can be retried after cache warm-up.
- Eager terminal publication means backend cleanup can continue briefly after the UI settles. Identity checks and late-resource disposal prevent that cleanup from mutating a newer run owner.
- Fake-timer tests must advance both startup and cleanup timers deliberately; shared helpers will avoid real one-minute waits.

## Verification

- Extend existing targeted test files before implementation and run them as a focused Mocha set.
- Run Node core tests, lint, build, SSOT invariant checks, and strict OpenSpec validation.
- Review the final diff for unrelated generated-file drift.
- Keep the change active until Windows manual acceptance covers OpenCode and Kilo Code for ten two-way concurrent sequence runs each.
