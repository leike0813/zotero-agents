## 1. OpenSpec and Docs

- [x] 1.1 Add `synthesis-work-governance` spec and delta specs for affected
      capabilities.
- [x] 1.2 Update Synthesis runtime, state machine, sequence, and Workbench docs
      to use WorkItem terminology.
- [x] 1.3 Validate the change with
      `npx openspec validate redesign-synthesis-work-governance --strict`.

## 2. Repository and Work Registry

- [x] 2.1 Add `synt_work_item`, `synt_work_run`, and `synt_work_queue_meta`
      schema, indexes, row types, and repository APIs.
- [x] 2.2 Add legacy migration from `synt_dirty_event` and `synt_job_state` to
      WorkItems and WorkRuns, then stop exposing old tables as runtime tables.
- [x] 2.3 Add static Work Registry for all Synthesis-owned work types and
      enforce owner/scope/coalescing validation.

## 3. Service Runtime

- [x] 3.1 Replace service queue APIs with `enqueueSynthesisWork`,
      `listSynthesisWorkItems`, `loadSynthesisWorkQueueState`,
      `runSynthesisWorkDrainOnce`, and `controlSynthesisWorkQueue`.
- [x] 3.2 Replace dirty-event filtering workers with owner-based WorkItem
      claim/run/heartbeat/finalize flow.
- [x] 3.3 Convert startup reconcile, registry, graph, metrics, related-items,
      freshness, and layout work to WorkItems.
- [x] 3.4 Add unified stale queued/running cleanup and retry/supersede policy.

## 4. UI and Host Bridge

- [x] 4.1 Replace Workbench snapshot maintenance fields with `workQueue` and
      `workItems`.
- [x] 4.2 Replace Host Bridge queue/jobs debug capabilities with
      `debug.synthesis.work.*`.
- [x] 4.3 Update CLI/debug tests and UI model tests for the breaking API.

## 5. Tests and Verification

- [x] 5.1 Add repository migration and Work Registry guard tests.
- [x] 5.2 Update worker/drain tests for WorkItem ownership and lifecycle.
- [x] 5.3 Update Workbench/debug/invariant tests.
- [x] 5.4 Run focused suites `143`, `145`, `146`, `150`, `152`.
- [x] 5.5 Run `npm run test:synthesis:invariants`,
      `npx tsc --noEmit --pretty false`, `npm run build`, and touched-file
      Prettier check.
