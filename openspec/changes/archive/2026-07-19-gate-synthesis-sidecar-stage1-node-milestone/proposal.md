## Why

Core 175–217 carry the cumulative proof for the Synthesis Stage 1 sidecar,
repository, application, runtime, and Worker foundation, but the existing PR
and release gates only run Zotero suites. Later changes have therefore been
able to regress earlier Node-only behavior without blocking integration.

## What Changes

- Add one fail-closed Stage 1 Node milestone suite covering every Core test
  numbered 175 through 217.
- Run the same milestone suite in both PR and release CI gates before their
  existing Zotero suite.
- Isolate the load-sensitive Core 202 test in its own process while retaining
  it as a blocking member of the milestone.
- Replace obsolete Core 125 and Core 213 source-text/order assertions with
  existing or extended observable-behavior coverage.

## Capabilities

### New Capabilities

- `synthesis-sidecar-stage1-node-milestone-gate`: Defines the cumulative Node
  milestone inventory, isolation, and PR/release blocking behavior.

### Modified Capabilities

None.

## Impact

This affects the Node test runner, package test scripts, the shared CI gate
orchestrator, and focused Synthesis tests. Product DTOs, RPC, storage,
dependencies, runtime assets, XPI packaging, and workflow entry points do not
change.
