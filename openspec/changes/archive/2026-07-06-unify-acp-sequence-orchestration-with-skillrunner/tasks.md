## 1. OpenSpec

- [x] 1.1 Add proposal, design, delta specs, and task list for the change.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Sequence orchestration persistence

- [x] 2.1 Add `plugin_workflow_sequence_runs` schema, memory adapter support,
  and CRUD APIs in `pluginStateStore`.
- [x] 2.2 Move `sequenceStateStore` persistence and list/read helpers to the
  workflow sequence store.
- [x] 2.3 Migrate legacy provider-table sequence root entries once and delete
  the old provider run entries without fallback reads.
- [x] 2.4 Add/adjust tests proving sequence roots do not hydrate as ACP or
  SkillRunner provider runs.

## 3. Execution seam and provider step identity

- [x] 3.1 Add a shared projectability predicate and ensure sequence root jobs
  are not written to taskRuntime or Dashboard history.
- [x] 3.2 Add `sequenceFinalStepId` to sequence progress context.
- [x] 3.3 Register ACP sequence step foreground runs with workflow run id,
  `<sequenceJobId>:<stepId>` job id, step task name, step index, and final step
  id.
- [x] 3.4 Preserve existing SkillRunner sequence behavior and final apply
  result flow.

## 4. Projections and consumers

- [x] 4.1 Carry sequence final step metadata through ACP summaries and active
  DTO mapping.
- [x] 4.2 Ensure Dashboard active/history inputs only contain ordinary
  non-sequence tasks plus concrete ACP/SkillRunner provider runs.
- [x] 4.3 Update Host Bridge workflow status to read sequence roots from the
  workflow sequence store and expose concrete step skill runs only.
- [x] 4.4 Keep workflow cancel targeting the root workflow id while skill-run
  reply/connect/cancel only target concrete provider run ids.

## 5. Tests and validation

- [x] 5.1 Add focused persistence, seam, projection, and Host Bridge regression
  tests for ACP and SkillRunner sequence runs.
- [x] 5.2 Run focused mocha for workflow seams, ACP runner, Host Bridge workflow
  control, sequence runtime, separated stores, and background refresh
  governance.
- [x] 5.3 Run `npx tsc --noEmit`.
- [x] 5.4 Run strict OpenSpec validation and `git diff --check`.
