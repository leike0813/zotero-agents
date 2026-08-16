## 1. Event Reducer Contract

- [x] 1.1 Add failing tests for all event variants, terminal guard, request identity conflict, snapshot no-op, apply failure, result merge, archive, and delete.
- [x] 1.2 Implement `SkillRunnerRunEvent` and `applySkillRunnerRunEvent` until reducer tests pass.

## 2. Source Caller Migration

- [x] 2.1 Migrate run seam and apply seam writes to event writes.
- [x] 2.2 Migrate foreground continuation, settlement, session sync, task runtime, queue manager, and UI callers.
- [x] 2.3 Delete all old mutation write exports and the public append bypass.

## 3. Test Migration

- [x] 3.1 Migrate direct mutation setup in SkillRunner-related tests to `applySkillRunnerRunEvent`.
- [x] 3.2 Delete old mutation-level assertions now covered by the reducer tests.

## 4. Documentation and Verification

- [x] 4.1 Update `provider-adapter` and `skillrunner-runkey-ssot` specs.
- [x] 4.2 Run focused SkillRunner/replay tests (198, 159, 48, 154, 162, 163, 42, 55, 71, 95, 97, 108, 193, 107, 93), type checks, and lint. `154` retains its pre-existing generated note readiness environment failure.
