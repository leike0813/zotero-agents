## Why

Builtin workflow `applyResult` hooks currently interpret skill output diagnostics inconsistently. Some hooks ignore `warnings`, while `tag-regulator` treats `error != null` as a hard business stop even when the apply payload is otherwise usable.

This change makes apply success depend on actual Zotero-side business application, not on agent-authored diagnostic fields.

## What Changes

- Normalize how builtin literature workbench apply hooks extract and return `warnings`.
- Treat skill output `error`, `status`, `kind`, and `reason` as diagnostics, not as automatic apply blockers.
- Attach skill diagnostics to apply failures and skip results so users can inspect backend concerns without losing recoverable writeback.
- Update `tag-regulator` to apply valid tag mutations even when the skill output includes a non-null `error`.
- Add focused regression coverage for analysis, explainer, deep-reading, translator, and tag-regulator apply hooks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `result-apply-handlers`: builtin apply hooks must preserve skill diagnostics while deciding success from actual apply behavior.
- `tag-regulator-workflow`: valid tag mutations must no longer be skipped solely because `error != null`.

## Impact

- Affected workflow package hooks under `workflows_builtin/literature-workbench-package/**/hooks`.
- Adds a shared literature workbench helper under `workflows_builtin/literature-workbench-package/lib`.
- Updates targeted workflow tests under `test/workflow-*`.
- No dependency changes, no Git history changes, and no development server startup.
