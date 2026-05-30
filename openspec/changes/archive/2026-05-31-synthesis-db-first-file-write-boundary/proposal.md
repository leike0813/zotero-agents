## Why

Synthesis runtime state still writes many JSON/canonical/projection files under `<persistence>/data/synthesis`, which makes clean-install debugging noisy and conflicts with the DB-first read model. The boundary must be tightened now because index rebuild, topic freshness, graph layout, and debug workflows are being used as the main Synthesis Layer debugging surface.

## What Changes

- **BREAKING**: Normal Workbench and background-task hot paths must not create or mutate `<persistence>/data/synthesis/**`.
- Move legacy file-backed Synthesis runtime artifacts out of the data root while DB-backed runtime state remains the source of truth.
- Treat old `data/synthesis/**` as explicit import/checkpoint input only; it must not influence normal UI snapshots, queues, graph rendering, freshness, or discovery.
- Keep explicit export/checkpoint/debug file generation available, but require it to use an explicit output or non-data runtime/debug location.
- Add tests that detect unintended `data/synthesis/**` creation during startup, snapshot, rebuild, workers, and reset flows.

## Capabilities

### New Capabilities

- `synthesis-file-write-boundary`: Defines where Synthesis runtime code may write files and which file outputs are explicit artifacts rather than hot-path state.

### Modified Capabilities

- `synthesis-workbench`: Workbench read/write paths must not depend on or regenerate `data/synthesis/**`.
- `synthesis-maintenance`: Background workers, index rebuild, and queue maintenance must not emit legacy JSON state under the data root.

## Impact

- Affects Synthesis path construction, topic artifact persistence, literature registry rebuild/projection code, Git Sync/mirror helpers, debug reset, and Synthesis tests.
- No dependency upgrades.
- No automatic migration in this change; old files are left for explicit import/checkpoint workflows.
