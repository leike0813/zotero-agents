## Why

Real-device testing exposed two broken user workflows: library migration could
finish without applying canonical mutations or usable feedback, and approving a
Topic Graph relation left terminal work visible in the review queue. Both
failures hide the actual operation outcome and invite repeated or conflicting
user actions.

## What Changes

- Make migration apply classify canonical mutation outcomes correctly, stop
  after a failed set, and preserve receipts for sets that already committed.
- Expose real scan/apply busy state and progress, lock mutation controls for the
  active transaction, and keep Stop available.
- Replace the flat migration log with bounded run and set detail, including
  titles, terminal outcomes, failure phase, and recovery diagnostics.
- Make the migration toolbar use the available width and move search and
  filters to a second row at narrow widths.
- Make Topic Graph review approval atomically confirm the edge, refresh
  hierarchy discovery when required, and remove terminal entries from open
  review surfaces while retaining them in Accepted and All history views.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-artifact-migration`: Define correct per-set failure semantics,
  active-operation feedback and locking, and bounded run/set history details.
- `synthesis-topic-graph`: Define approval as a terminal atomic edge
  confirmation and require the existing hierarchy discovery cascade after a
  confirmed `broader_than` relation.
- `synthesis-workbench-ui`: Restrict open Topic relation review surfaces to
  pending work while preserving terminal decisions in historical filters.

## Impact

- Affects the Dashboard-local migration service, durable migration receipts,
  Dashboard migration projection/components/styles, and their existing tests.
- Affects the Rust Synthesis Topic Graph application and runtime refresh path,
  plus Topics and Review Center projections and their existing tests.
- Changes no public transport contract and adds no dependency or new runtime
  owner.
