## Why

The metadata curator fallback can mistake a publication container for a selected
chapter or contribution and overwrite the item's title. It also cannot correct a
wrong Zotero bibliographic item type even when authoritative metadata identifies
the work as a thesis, report, book section, or another regular item type.

## What Changes

- Require stronger same-work evidence before the fallback skill changes an
  existing title without a stable identifier.
- Extend canonical metadata results with an optional `metadata.itemType`.
- Allow the parent metadata handler and curator apply hook to change between
  regular Zotero bibliographic item types before applying type-specific fields.
- Keep attachments, notes, annotations, tags, collections, related items, and
  local files outside the mutation surface.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-workflows`: Tightens fallback identity rules and permits
  evidence-backed item-type corrections.
- `result-apply-handlers`: Extends parent metadata updates to apply a valid
  regular item-type change atomically with metadata fields and creators.

## Impact

- `literature-metadata-search` skill instructions, schema, and runner metadata.
- `literature-metadata-curator` workflow hooks, README, and manifest version.
- Shared parent metadata handler and Zotero test mock.
- Focused workflow and handler regression coverage.
