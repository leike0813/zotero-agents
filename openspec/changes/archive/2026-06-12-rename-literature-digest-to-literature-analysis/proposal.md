## Why

The `literature-digest` skill has been rewritten and replaced by the new `literature-analysis` skill (submoduled at `skills_builtin/literature-analysis/`). The workflow at `workflows_builtin/literature-workbench-package/literature-digest/` still references the old skill ID `"literature-digest"`, causing it to dispatch to the obsolete skill. This change renames the workflow to `literature-analysis` and updates all references to point to the new skill.

## What Changes

- **BREAKING**: Workflow directory renamed from `literature-digest/` to `literature-analysis/`
- Workflow `id` changed from `"literature-digest"` to `"literature-analysis"`
- Workflow `label` changed from `"Literature Digest"` to `"Literature Analysis"`
- `skill_id` in `buildRequest.mjs` hook changed from `"literature-digest"` to `"literature-analysis"`
- All hooks, log prefixes, error messages updated to reflect new name
- Registration files (`manifest.json`, `workflow-package.json`) path updated
- Library files (`noteCodecs.mjs`, `digestPayload.mjs`) gain backward-compatible recognition of new kind string while retaining support for old kind strings on existing notes
- Source files (`synthesisWorkbenchApp.ts`, `service.ts`) updated with new name in UI strings and reviewer labels
- All test files updated to reference new workflow/skill ID
- Test directories and fixture directories renamed to match

## Capabilities

### New Capabilities

- `workflow-rename-contract`: Coverage of workflow directory rename, registration path updates, hook ID references, and backward-compatible kind recognition in library files

### Modified Capabilities

- `literature-workbench-workflows`: Workflow ID and skill_id references changed from `"literature-digest"` to `"literature-analysis"`; no behavioral requirement changes
- `literature-workbench-package`: Package registration path updated; no contract changes
- `literature-digest-artifact-contract`: Spec references updated to new workflow name; artifact behavior unchanged
- `literature-digest-note-source-link`: Spec references updated; no requirement changes
- `literature-digest-representative-image`: Spec references updated; no requirement changes

## Impact

- `workflows_builtin/literature-workbench-package/literature-digest/` — entire directory renamed
- `workflows_builtin/manifest.json` — 7 path entries updated
- `workflows_builtin/literature-workbench-package/workflow-package.json` — workflow reference path updated
- `workflows_builtin/literature-workbench-package/literature-analysis/hooks/` — 3 hook files updated
- `workflows_builtin/literature-workbench-package/literature-analysis/README.md` — updated
- `workflows_builtin/literature-workbench-package/lib/noteCodecs.mjs` — new kind added
- `workflows_builtin/literature-workbench-package/lib/digestPayload.mjs` — new kind added
- `src/` — 2 source files updated
- `test/` — ~30 test files updated, 2 directories renamed
- `test/mock-skillrunner/` — 2 mock server files updated
- `doc/`, `openspec/specs/` — documentation references updated
