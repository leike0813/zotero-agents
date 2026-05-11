# Fix Synthesis Citation Graph And UI

## Why

The current Synthesis citation graph can create far more nodes than the library
size warrants because low-structure references are keyed by source paper and
reference index. The Workbench graph view also uses a simple SVG circle layout
instead of the planned persisted-layout plus WebGL explorer.

## What Changes

- Stabilize reference identity and promotion with citekey, DOI, arXiv, URL,
  title/year/first-author, and normalized raw fallback keys.
- Merge repeated external/unresolved references across source papers and drop
  references that have no usable identity.
- Add graph diagnostics for node counts, reference processing, promotions, and
  dropped references.
- Render the Workbench Citation Graph with Sigma.js over persisted graph layout
  presets, with search, filters, hover highlighting, and click details.
- Add a Workbench graph rebuild action that refreshes the persisted graph and
  layout snapshots.

## Impact

- Affects Synthesis citation graph projection, Zotero artifact adaptation,
  Workbench graph DTOs, and the Synthesis Workbench frontend bundle.
- Adds `sigma` as a runtime dependency for the Workbench graph renderer.
