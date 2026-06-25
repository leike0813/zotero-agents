## Why

SkillRunner and ACP Skills currently use different sources for banner subtitles and task-card secondary lines. This makes single workflow runs and sequence steps visually inconsistent and can show workflow names where users expect the currently executed skill.

## What Changes

- Unify the secondary display label for SkillRunner and ACP Skills banner subtitles.
- Use the same secondary display label for task-card lines below the title.
- Preserve ACP Chat conversation/backend secondary labels.
- Preserve ACP sequence step index in the ACP Skills read model so sequence labels can include the current step number.

## Capabilities

### New Capabilities

### Modified Capabilities

- `skillrunner-sidebar-host-runtime`: SkillRunner run rows and selected banner use the unified secondary display rule.
- `acp-skillrunner-run-panel`: ACP Skills run rows and selected banner use the unified secondary display rule and preserve sequence step index.

## Impact

- Affects assistant panel projection and ACP skill run read model fields.
- Adds focused smoke and store regression coverage.
