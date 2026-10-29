# Proposal

## Why

`npm test` currently runs only regular Node shards. WF-01 has passed local Linux
7/9/10 acceptance but is omitted by CI family selection, so regressions in the
20 production workflow paths do not block pull requests or releases.

## What Changes

- Make `npm test` the complete routine suite: shared governance, native tests,
  all Node shards, and the full real-Zotero layer including offline E2E.
- Reuse the existing gate orchestrator without recursive npm entrypoints.
- Add independent blocking WF cells for Linux Zotero 10 on PRs and Linux
  Zotero 7/9/10 on main and release gates, preserving existing promoted cells.
- Prepare portable Python and current-source native tools in CI. Workflow
  gates use synthetic peers and cannot select live capture.
- Keep failed, incomplete, cleanup-failed, and unhealthy E2E verdicts blocking.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-suite-gating-strategy`: complete local entrypoint and blocking workflow
  business-path coverage across local, PR, main and release execution.
- `system-e2e-strategy`: distinguish workflow acceptance evidence from the
  separately authorized required CI gates.

## Impact

Package scripts, existing gate orchestration, E2E family selection and
compatibility matrix, GitHub CI/release jobs, Python test helpers, and test
documentation. No runtime business protocol, release identity, dependency
declaration, or published artifact changes are required.
