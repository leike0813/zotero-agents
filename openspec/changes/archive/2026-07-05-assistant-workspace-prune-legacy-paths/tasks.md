## 1. OpenSpec

- [x] 1.1 Create proposal, design, tasks, and delta spec for legacy path pruning.

## 2. Host Path Pruning

- [x] 2.1 Remove per-post shell handshake scheduling and narrow ACP Chat backend refresh boundaries.
- [x] 2.2 Stop the shared ACP frontend subscription from publishing generic panel snapshots.
- [x] 2.3 Add current-scope init dedupe for shell-ready and duplicate child-ready without suppressing tab-switch refreshes.

## 3. SkillRunner Action Cleanup

- [x] 3.1 Make SkillRunner task selection send a single `select-task` action and close host drawer chrome from that action.

## 4. Tests and Verification

- [x] 4.1 Update source/behavior smoke coverage for pruned handshake, refresh, subscription, init, and SkillRunner action paths.
- [x] 4.2 Run OpenSpec validation, focused workspace/UI tests, TypeScript, and touched-file formatting checks.
