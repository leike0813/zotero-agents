## 1. Regression coverage

- [x] 1.1 Add a deterministic two-unit ACP SkillRunner test with
      `maxConcurrency: 2`, independent fake adapters, and barriers proving both
      units reach initialization, session creation, and prompt start.
- [x] 1.2 Add setup cancellation race tests covering cancellation before adapter
      creation, cancellation while adapter creation resolves, and stale setup
      cleanup after live-controller registration.

## 2. Diagnostics

- [x] 2.1 Add request-scoped setup-stage events and last-stage projection using
      existing run audit/event infrastructure.
- [x] 2.2 Include submission lineage and available transport spawn/child
      identity without exposing credentials or request payloads.

## 3. Lifecycle fix

- [x] 3.1 Implement a setup-only cancellation handle that registers before
      blocking setup awaits and never claims connected/recoverable state.
- [x] 3.2 Add cancellation checks, late-adapter close, and exactly-once canceled
      settlement across setup awaits.
- [x] 3.3 Make setup-to-live registration and cleanup identity/generation-safe
      while preserving existing live controller behavior.

## 4. Verification

- [x] 4.1 Run targeted ACP and Host queue tests, then the core test suite and
      TypeScript/build checks required by the repository.
- [x] 4.2 Perform Windows Kilo ACP manual acceptance with concurrency two and
      compare both request audit trails; document any external-stage blocker
      without speculative bridge, npx, or Kilo isolation changes.

Verification note (2026-08-07): Linux automated verification covered the full
Node core suite, which reported 2824 passing, 62 pending, and one pre-existing
assertion drift in `test/core/154-skillrunner-sequence-runtime.test.ts`:
`HEAD` already includes undefined `submissionId` and `submissionUnitId` keys
while the test expects those keys to be absent. After the final setup-stage
event de-duplication refinement, the targeted ACP set passed 180 tests, the
Host queue set passed 15 tests, and TypeScript, ESLint, Prettier, and strict
OpenSpec validation passed. Windows/Kilo manual acceptance remains pending
because this workspace is running on Linux.
