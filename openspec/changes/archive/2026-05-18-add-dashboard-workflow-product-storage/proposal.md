# Add Dashboard Workflow Product Storage

## Summary

Add a Dashboard Products area for workflow-produced artifacts. Products are
registered explicitly by workflow `applyResult` hooks through a host API instead
of being inferred from workflow ids or result kinds.

## Why

ACP runs can keep artifacts in a local workspace, while SkillRunner runs may only
provide a result bundle. The Dashboard needs a backend-neutral product index and
local cache so completed workflow artifacts remain browseable after task history
or remote bundles are unavailable.

## What Changes

- Add a workflow product storage API injected into `applyResult` hooks.
- Persist product records independently from task history and ACP run panels.
- Cache bundle-only artifacts locally while preserving ACP local-workspace
  references.
- Add a Dashboard Products tab with product list, file tree, and text previews.
- Register `manuscript-literature-framing` artifacts through the new API.

## Out of Scope

- Editing products.
- LaTeX compilation.
- Syncing products to Zotero notes or Synthesis canonical assets.
- Deleting real artifact files from the original run workspace.
