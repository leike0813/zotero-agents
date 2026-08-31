## Why

When an ACP Skills submission admits two units concurrently, a unit can be
visible in the run store before its ACP adapter and live controller exist. This
leaves setup work uncancelable through the normal controller path and makes a
second run appear submitted while its actual execution stage is unknown. The
existing queue tests prove two slots are admitted, so the missing evidence and
lifecycle boundary must be addressed in the ACP runner.

## What Changes

- Add request-scoped ACP setup-stage diagnostics so concurrent runs can be
  compared by request, submission unit, transport spawn, and last completed
  stage.
- Add an internal setup-only cancellation handle that is available before the
  adapter/session is created, without claiming the run is connected or
  recoverable.
- Make setup cancellation race-safe across adapter creation and the transition
  to the existing live controller.
- Add deterministic concurrent ACP runner regression tests and setup-cancel
  race tests.
- Do not alter Host queue admission, the native Windows bridge, npx lease
  behavior, ACP adapter public signatures, or Kilo XDG isolation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-skills-interactive-execution`: ACP Skill setup must be observable and
  cancellable before a live session exists, while live connection and recovery
  semantics remain unchanged.

## Impact

- Affected modules: ACP Skill runner orchestration and ACP Skill run store.
- Affected tests: ACP SkillRunner-compatible execution tests and Host queue
  concurrency tests.
- No dependency, Host Bridge, or external ACP protocol changes.
