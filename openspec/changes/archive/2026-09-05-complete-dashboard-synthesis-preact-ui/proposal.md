## Why

Dashboard has migrated to Preact but still needs lifecycle and contract cleanup. Synthesis business components exist independently while the production bundle still runs the old monolithic renderer; its new assembly renders placeholders.

## What Changes

- Finish Dashboard shared contracts, local state ownership, localization and cleanup.
- Assemble all Synthesis surfaces with independent Preact roots and stable region signatures.
- Connect graph paging, reader messages and actions without changing host wire behavior.
- Bound Topics and Registry DOM windows, and use the shared Markdown renderer.
- Provide hosted, standalone graph and standalone topic entry points; retire the monolithic implementation and migrate source-dependent tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-ui`: independent regions, bounded lists and offline export composition.
- `task-runtime-ui`: Dashboard region identity and page lifecycle cleanup.

## Impact

Page sources, shared wire contracts, host type imports and export asset selection, browser build entries, localization checks, existing UI tests and generated deep-reading graph assets. No backend protocol, dependency, Host Bridge or sidecar changes.
