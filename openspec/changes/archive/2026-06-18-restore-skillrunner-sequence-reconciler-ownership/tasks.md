## 1. OpenSpec Contract

- [x] 1.1 Add proposal/design/tasks and delta specs for reconciler-owned SkillRunner sequence apply
- [x] 1.2 Validate `restore-skillrunner-sequence-reconciler-ownership` with OpenSpec strict mode

## 2. Sequence Apply Routing

- [x] 2.1 Keep ACP foreground step apply behavior unchanged
- [x] 2.2 Prevent SkillRunner sequence runtime from invoking foreground `applySequenceStepResult`
- [x] 2.3 Preserve SkillRunner step request/workspace/result/task projection behavior

## 3. SkillRunner Reconciler Ownership

- [x] 3.1 Move SkillRunner sequence step apply execution into reconciler terminal success handling
- [x] 3.2 Continue downstream SkillRunner steps only after terminal step apply settlement
- [x] 3.3 Preserve deferred workflow completion/toast settlement for SkillRunner sequence steps

## 4. ACP Store Guard

- [x] 4.1 Prevent `markAcpSkillRunApplyResult` from creating empty ACP runs for unknown request ids
- [x] 4.2 Ensure SkillRunner sequence apply/reconciler paths never write ACP run-store state

## 5. Tests And Verification

- [x] 5.1 Add focused regressions for SkillRunner reconciler-owned sequence apply and ACP pollution guard
- [x] 5.2 Run TypeScript, focused Mocha suites, OpenSpec validation, and `git diff --check`
