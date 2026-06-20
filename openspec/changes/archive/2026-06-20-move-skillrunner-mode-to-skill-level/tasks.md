# Tasks

- [x] 1. Add spec deltas for workflow contract, workflow execution runtime, and provider adapter.
- [x] 2. Update workflow schema and TypeScript types to remove workflow-level mode fields and add skill-level mode fields.
- [x] 3. Update declarative compiler and runtime normalization for single job mode.
- [x] 4. Update sequence runtime so every step uses its own mode when constructing provider requests.
- [x] 5. Update settings/UI/diagnostic readers to derive mode from compiled requests instead of `manifest.execution`.
- [x] 6. Migrate builtin workflows, buildRequest hooks, and fixtures from `execution.skillrunner_mode` to skill-level `mode`.
- [x] 7. Update focused tests for loader validation, request construction, sequence mixed mode, settings, and builtin workflow scans.
- [x] 8. Run OpenSpec validation, TypeScript, focused Mocha tests, and diff check.
