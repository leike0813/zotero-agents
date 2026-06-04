## Why

Citation Graph currently exposes compact, balanced, and expanded layout presets
that all run the same d3-force algorithm with different parameters. The visual
difference is hard to control and each preset can require a separate force
layout computation.

Users should instead choose among layout algorithms: one high-quality force
layout and lightweight deterministic alternatives for different reading tasks.

## What Changes

- Replace Graph layout preset UI with algorithm choices: Force, Radial, and
  Components.
- Keep d3-force as the default Force layout, using one slightly looser parameter
  set.
- Add deterministic Radial and Components layouts that do not run force
  iterations.
- Preserve compatibility for old compact, balanced, and expanded inputs by
  mapping them to Force.
- Reuse the existing layout state table without a DB migration; the stored
  preset key now carries the algorithm value.

## Impact

- Affected areas:
  - Citation graph layout computation.
  - Synthesis Workbench graph UI state and controls.
  - Workbench host command flow for manual and automatic layout recompute.
  - Citation graph layout tests and UI source assertions.
- Existing layout cache entries with version before 1.2 become stale and are
  recomputed on demand.
