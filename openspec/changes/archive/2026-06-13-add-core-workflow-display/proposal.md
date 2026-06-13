## Why

Workflow packages need a small display-only signal for first-class workflows. Core workflows should be easier to find in menus and on the Dashboard without changing workflow ids, request payloads, persisted parameter keys, or runtime semantics.

## What Changes

- Add optional workflow manifest display metadata for core status and emoji prefixes.
- Render core workflows above non-core workflows in the workflow menu, with a separator between groups and bold core labels.
- Expose core status in Dashboard home workflow bubbles and render a localized Core badge.
- Mark selected built-in workflows as core, add emoji prefixes, and fill missing zh-CN workflow copy.

## Impact

- Affected specs: workflow-manifest-authoring-schema, workflow-menu, task-runtime-ui, plugin-localization-governance.
- Affected code: workflow manifest types/schema, workflow display projection, workflow menu, Dashboard home snapshot/rendering, built-in workflow manifests/locales.
