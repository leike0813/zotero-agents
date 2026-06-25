# Tasks

- [x] Add OpenSpec artifacts for separated ACP/SR run-store rewrite.
- [x] Add ACP-only and SkillRunner-only SQLite run/event tables.
- [x] Add one-time legacy ACP/SR local-state reset marker.
- [x] Move ACP run persistence off `plugin_task_rows(acp, skill-runs)`.
- [x] Add ACP store guard rejecting non-ACP backend types.
- [x] Add SkillRunner run store and event model.
- [x] Mirror SkillRunner task/reconciler/session state into the new store.
- [x] Derive SkillRunner task/history projections from the new store.
- [x] Remove legacy SkillRunner request ledger module and all runtime writes.
- [x] Move SkillRunner reconciler restore/retry state fully into `SkillRunnerRunStore`.
- [x] Move sequence state persistence out of `workflow-sequence` context store.
- [x] Add hard-cut v2 cleanup marker and cleanup-only legacy SkillRunner rows.
- [x] Add focused store/projection/sequence tests.
- [x] Run OpenSpec, TypeScript, focused mocha, and diff checks.
