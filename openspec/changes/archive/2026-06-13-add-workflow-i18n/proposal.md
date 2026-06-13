## Why

Workflow packages are pluggable, so their user-visible labels and parameter copy cannot be governed only through the plugin's built-in Fluent files. Workflow authors need a way to ship localized display strings with the workflow package while keeping workflow ids, parameter keys, payloads, logs, and generated content stable.

## What Changes

- Add optional workflow/package i18n metadata for fixed workflow UI copy.
- Resolve workflow display text through a localized projection at UI boundaries.
- Keep raw manifest strings as the fallback and stable runtime contract.
- Update built-in workflow package resources so common workflow labels and parameter titles can render in Chinese.
- Document that plugin `.ftl` files own plugin UI strings, while workflow packages own workflow-specific display strings.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workflow-manifest-authoring-schema`: workflow and workflow-package manifests can declare package-owned i18n resources.
- `workflow-settings-dialog-model`: settings descriptors expose localized workflow and parameter display copy.
- `workflow-menu`: workflow menu entries use localized display labels.
- `task-runtime-ui`: dashboard workflow cards and newly-created run display labels use localized workflow labels.
- `plugin-localization-governance`: governance distinguishes plugin Fluent ownership from workflow package i18n ownership.

## Impact

- Affects workflow schemas, loader contracts, workflow localization helper, settings/menu/dashboard display model call sites, built-in workflow package assets, docs, and focused tests.
- No dependency changes.
- No migration for existing persisted tasks or workflow settings.
