# Tasks

- [x] Add OpenSpec runKey SSOT requirement delta.
- [x] Expose `runKey` through `WorkflowTaskRecord`, SkillRunner run store projections, and task runtime update returns.
- [x] Refactor SkillRunner panel/dialog selection and exact reads to use `runKey` only.
- [x] Refactor submit focus, sidebar open focus, dashboard open/archive payloads, and host actions to use `runKey`.
- [x] Enforce one projectable `runKey` per SkillRunner `(backendId, requestId)` after request-ready.
- [x] Remove legacy UI identity resolver fields and source tests.
- [x] Update focused unit/integration/governance tests and run verification.
