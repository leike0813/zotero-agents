## 1. OpenSpec

- [ ] 1.1 Add proposal/design/tasks artifacts for the stream pool change.
- [ ] 1.2 Add provider-adapter, task-dashboard-skillrunner-observe, and
  task-runtime-ui delta specs.
- [ ] 1.3 Validate the change with
  `npx openspec validate stabilize-skillrunner-connection-and-ui-stream-pool --strict`.

## 2. Connection Governor

- [ ] 2.1 Extend foreground-stream handling to allow two active streams per
  backend and one active stream per backend/requestId.
- [ ] 2.2 Track `lastFocusedAt` for foreground stream entries and expose it in
  snapshots.
- [ ] 2.3 Evict the least-recently focused stream when a third foreground stream
  is requested for the same backend.
- [ ] 2.4 Ensure submit still starts while two foreground streams are active.

## 3. RunDialog Stream Pool

- [ ] 3.1 Split selected workspace entry from per-run stream session ownership.
- [ ] 3.2 Keep the previous run stream warm when switching to a second run.
- [ ] 3.3 Evict the least-recently focused stream when selecting a third run.
- [ ] 3.4 Stop stream sessions on waiting, terminal, backend-gated, and workspace
  shutdown.
- [ ] 3.5 Prevent foreground chat events from calling background session sync.
- [ ] 3.6 Keep clean stream reconnect lightweight and move history catch-up to
  explicit gap/error/refresh paths.
- [ ] 3.7 Prevent SkillRunner provider progress from auto-selecting newly
  submitted runs.
- [ ] 3.8 Remove temporary request placeholder task rows; projections must come
  from the SkillRunner run store.
- [ ] 3.9 Keep workspace refresh selection stable: preserve the current visible
  run and otherwise show no selection instead of auto-picking a fallback task.
- [ ] 3.10 Gate SkillRunner task/runtime/history projections on request-ready
  so queued, running, and request-created jobs do not create user-visible rows.
- [ ] 3.11 Treat SkillRunner pre-ready dispatch failures as terminal foreground
  failures with request-scoped audit logs, not hidden recoverable pending runs.

## 4. SSE And Tests

- [ ] 4.1 Parse both LF and CRLF SSE frame boundaries.
- [ ] 4.2 Add governor tests for two-stream pooling, LRU eviction, duplicate
  request suppression, and submit availability.
- [ ] 4.3 Add RunDialog tests for A/B warm switching, A/B/C eviction, no
  background session sync from chat events, and no clean-close query storm.
- [ ] 4.4 Add regression coverage for user-driven SkillRunner selection and no
  temporary run rows.
- [ ] 4.5 Add regression coverage for request-ready projection gating.
- [ ] 4.6 Add regression coverage for pre-ready failure settlement and timeout
  audit behavior.
- [ ] 4.7 Run focused SkillRunner validation commands and `git diff --check`.
