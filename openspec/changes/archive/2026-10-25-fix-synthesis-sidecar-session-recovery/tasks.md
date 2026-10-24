# Tasks

## 1. Session recovery and health diagnostics

- [x] 1.1 Add a failing regression at the existing supervisor boundary for delayed stderr completion, concurrent failures, and late startup/health results; fix session ownership and verify the supervisor suite passes.
- [x] 1.2 Persist the safe first health-control cause using shared control-error normalization; verify timeout and unsafe-error cases in existing supervisor/control tests.
- [x] 1.3 Document session-scoped teardown and causal health diagnostics in the runtime supervision document and project constraints; verify wording matches implemented behavior.

## 2. Availability-aware Workbench observation

- [x] 2.1 Add failing mounted Workbench tests, implement non-ready suspension and five-second unavailable backoff, and verify readiness recovery, cached content, original maintenance deadline, and disposal behavior.
- [x] 2.2 Document progress suspension and resumption in the runtime supervision document; verify the documented cadence against focused tests.

## 3. Integration validation

- [x] 3.1 Run the targeted supervisor, Workbench and observability suites, relevant TypeScript/lint/format checks, and strict OpenSpec validation; record commands, results, and any pre-existing failures in validation.md.

## Workflow follow-up

- Build, installation, live Zotero acceptance, archive, and Git commit are outside this delivery.
