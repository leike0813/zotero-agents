## Why

Dashboard Products rebuilds its selected surface after product, asset, and Skill Feedback selection, but its three browsing lists do not preserve scroll ownership, so routine selection returns users to the first row. Product folders also open eagerly, and the generated Research Bundle README contains a malformed paper-index delimiter row that prevents standard Markdown rendering.

## What Changes

- Preserve Products and skill-filtered Skill Feedback list scroll positions across selection-driven surface refreshes.
- Make product file-tree folders collapsed by default, while retaining page-local expansion and scroll state per product.
- Generate a seven-cell delimiter row for the seven-column Research Bundle paper index.
- Add browser and workflow regression coverage and document the resulting UI stability contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-runtime-ui`: Products browsing must preserve stable scroll owners, and product file trees must start collapsed while retaining state per product.
- `research-bundle-workflow`: Generated README Topic and paper indexes must use valid Markdown table structure.

## Impact

- Affects the Dashboard Products browser renderer, its page-local interaction state, and targeted Playwright coverage.
- Affects the Literature Workbench Research Bundle README generator and its workflow tests.
- Updates the UI rendering stability documentation and the two modified capability specifications.
- Does not change Dashboard snapshots, backend DTOs, persistence formats, dependencies, the shared Markdown renderer, or existing exported Products.
