## 1. OpenSpec

- [ ] 1.1 Add proposal/design/tasks artifacts for request-ready settlement
  governance.
- [ ] 1.2 Add provider-adapter, workflow-execution-seams,
  task-dashboard-skillrunner-observe, and task-runtime-ui delta specs.
- [ ] 1.3 Validate the change with
  `npx openspec validate govern-skillrunner-request-ready-settlement --strict`.

## 2. Provider Submit-Only Boundary

- [ ] 2.1 Make SkillRunner create/upload return deferred immediately after
  `request-ready`.
- [ ] 2.2 Prevent provider foreground code from polling state or fetching
  result/bundle after request-ready.
- [ ] 2.3 Keep pre-ready create/upload failures foreground-terminal with
  request-scoped audit logs and bounded timeout.
- [ ] 2.4 Register request-ready runs for reconciler-owned settlement.

## 3. Run Store And Projection

- [ ] 3.1 Add local SkillRunner lifecycle support for `request_ready` without
  leaking that state into generic backend `JobState`.
- [ ] 3.2 Project `applyState`, `applyError`, `applyNextRetryAt`,
  `resultJsonPath`, `workspaceDir`, role, and sequence step metadata.
- [ ] 3.3 Keep terminal runs with pending/running/failed apply visible.
- [ ] 3.4 Ensure ACP run store APIs reject SkillRunner request ids.

## 4. Reconciler Settlement

- [ ] 4.1 Fetch and normalize terminal result/bundle only from the reconciler.
- [ ] 4.2 Support SkillRunner `responseJson.data` and namespaced result paths.
- [ ] 4.3 Write visible failed or retry state for parse, bundle, apply hook,
  Host Bridge, and store failures.
- [ ] 4.4 Treat run-level `400/404/410/422` as single-run failed settlement,
  not backend unreachable.
- [ ] 4.5 Avoid high-frequency backend polling while waiting for retry windows.

## 5. Sequence

- [ ] 5.1 Continue SkillRunner sequence steps after result/handoff projection,
  not after apply success.
- [ ] 5.2 Stop only when a required handoff cannot be produced.
- [ ] 5.3 Keep step apply as asynchronous deferred apply and record its outcome
  on the step run.
- [ ] 5.4 Preserve step0 new workspace and stepN previous-request workspace reuse.

## 6. Tests And Validation

- [ ] 6.1 Add provider tests for request-ready deferred and no post-ready polling.
- [ ] 6.2 Add workflow seam tests for SkillRunner reconciler-owned pending jobs
  in auto and interactive modes.
- [ ] 6.3 Add reconciler tests for result/bundle normalization, visible apply
  failure, retry, and sequence continuation independent of apply.
- [ ] 6.4 Add projection/UI tests for persistent deferred apply indicators.
- [ ] 6.5 Run focused SkillRunner validation, SSOT invariant checks, TypeScript,
  and `git diff --check`.
