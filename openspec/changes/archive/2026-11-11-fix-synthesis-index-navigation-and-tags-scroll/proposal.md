# Proposal

## Why

Index drops first/last/page-number actions at the page boundary, resets the selected page on tab return, and mixes background counting with page loading. Tags mounts every row, making large vocabularies expensive to scroll and dispose; the observed timeout/restart sequence needs production acceptance. Half-star glyph overlays can misalign.

## What Changes

- Preserve the 100-parent page and 25-source batch boundaries, forward every existing pagination action, and separate page loading from count feedback.
- Retain the current Index page, expansion, focus and scroll during tab changes; pause source enumeration after the current batch and resume the same live traversal on return.
- Window vocabulary and staged Tag rows through the existing measured-list component.
- Draw outlined and partially filled rating stars from one SVG shape.
- Extend existing regression and isolated Zotero acceptance paths, including service identity and health evidence during heavy scrolling and tab changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-ui`: complete navigation, independent count feedback, live query suspension, preserved Index interaction state, bounded Tag rendering and aligned rating shapes.

## Impact

Workbench host, page controller, renderer, shared measured window, Index and Tag components, page styles/i18n, existing tests and Workbench documentation. Existing wire shapes and cache budgets remain intact. No dependencies, migrations, publication or Git commits.
