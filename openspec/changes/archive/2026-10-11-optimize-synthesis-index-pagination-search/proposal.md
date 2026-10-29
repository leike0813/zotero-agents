# Proposal

## Why

Index filters currently operate after source-window pagination, so searches miss documents outside the loaded window and filtered page counts are misleading. Loading later slices also provides no visible feedback at the end of the table.

## What Changes

- Apply existing metadata and reference-text search and filters across the selected library before counting and paging matching parents.
- Show bottom icon pagination with first/previous/editable page/next/last controls.
- Keep 100 matching library parents per page; their reference children do not consume page slots and remain available through lazy detail reads.
- Publish initial matches before background counting finishes and show slice-loading animation.
- Replace first-window-only reuse with bounded query directories and visited-page caching.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-ui`: global Index filtering, parent-based bottom pagination and visible progressive loading.

## Impact

Workbench page/host contracts and JSON schema, Rust Reference projection, host query lifecycle and cache, localization, tests and Index documentation. No dependency, persistent index or library-data migration is required.
