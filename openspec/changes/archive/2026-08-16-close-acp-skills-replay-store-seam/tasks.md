## 1. Replay Permission Contract

- [x] 1.1 Add a failing ACP Skills replay permission test that drives the standard queue and resolves the recorded outcome.
- [x] 1.2 Migrate replay target permission handling to `handleAcpSkillRunPermissionRequest` and `resolveAcpSkillRunPermissionRequest`.

## 2. Generic Cleanup and Timer Seams

- [x] 2.1 Add `deleteAcpSkillRunRecords` and migrate replay cleanup plus the 181 afterEach cleanup.
- [x] 2.2 Rename `inspectSyntheticAcpSkillRunReplayTimers` to `inspectAcpSkillRunTimers` in the workspace data plane and remove the store re-export.

## 3. Remove Replay-Specific Store Surface

- [x] 3.1 Inline replay record creation with `upsertAcpSkillRun`.
- [x] 3.2 Delete the four replay-specific exports and update all callers.

## 4. Documentation and Verification

- [x] 4.1 Update `acp-runtime-replay-profiler` and `acp-skills-interactive-execution` specs.
- [x] 4.2 Update runtime diagnostics manifest markers.
- [x] 4.3 Run focused replay tests (181, 179, 180), release-elision test, type checks, and lint. The previously failing replay-disabled marker check now passes after removing the ACP Skills replay-specific store markers.
