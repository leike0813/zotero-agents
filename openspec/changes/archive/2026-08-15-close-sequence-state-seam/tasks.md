## 1. Sequence State Reducer Contract

- [x] 1.1 Add failing tests for the ten event types, derived completion, short-circuit, apply-failure policy, root request identity, conflict throws, and terminal idempotency.
- [x] 1.2 Extract `valuePath.ts` and implement `applySequenceRunEvent` until reducer tests pass.

## 2. Caller Migration

- [x] 2.1 Migrate `sequenceRuntime` to event writes and remove local terminal policy helpers.
- [x] 2.2 Migrate `acpSkillRunStore` terminal propagation to `sequence.step.terminal`.
- [x] 2.3 Migrate `skillRunnerForegroundContinuation` waiting and terminal writes to events.
- [x] 2.4 Migrate `acpSkillRunRecovery` terminal write to `sequence.run.terminal`.
- [x] 2.5 Delete the ten old mutation exports and the unused waiting-interaction export.

## 3. Test Migration

- [x] 3.1 Migrate direct record/mark setup calls in core integration tests to the event seam.
- [x] 3.2 Delete old record/mark-level assertions now covered by the reducer tests.

## 4. Documentation and Verification

- [x] 4.1 Update `openspec/specs/workflow-execution-seams/spec.md` with the fact-event contract.
- [x] 4.2 Run focused sequence/execution tests (196, 154, 48, 107, 108, 159, 193), type checks, and lint. Full core attempt reached unrelated pre-existing `96-acp-session-manager-*` failures and the suite timeout; those files fail identically when run alone.
