# Change: Add Workflow Dynamic Parameter Options

## Why

Workflow parameters currently support only static `enum` values. Parameters such
as `literature-search-ingest.targetCollection` need choices from the active
Zotero library, but the UI has no common way to resolve and render dynamic
options.

## What Changes

- Add a workflow parameter `optionsSource` contract.
- Add a UI-facing option DTO that separates the submitted value from the user
  label.
- Implement the first built-in dynamic source: `zotero.collections`.
- Render dynamic collection choices in workflow settings while preserving custom
  text input.
- Teach host collection resolution to accept stable `<libraryId>:<collectionKey>`
  refs.
- Update Literature Search Ingest to use dynamic Target Collection options.

## Impact

- Affects workflow manifest schema/types, workflow settings descriptors and UI,
  Zotero collection resolution, and the literature search ingest workflow.
- Does not add workflow-defined JavaScript option providers.
