## Why

Low-confidence title tiers currently risk being stored as automatic matches and
therefore as matched citation graph edges. The latest design requires
precision-first matching: useful weak candidates remain suggestions until an
explicit confirmation writes a durable resolution fact.

## What Changes

- Return `suggested` results for low-confidence title tiers.
- Materialize only deterministic/high-confidence matches as automatic matched
  resolutions.
- Keep suggestion candidates bounded and diagnostic.
- Prevent suggestion-only resolutions from creating matched citation graph
  edges.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-reference-resolution-matcher`: Enforces suggested vs matched
  separation.
- `synthesis-literature-registry-citation-graph`: Consumes only graph-safe
  matches for matched edges.

## Impact

Affected implementation includes `referenceMatcher.ts`, Registry reference
resolution writing, citation edge materialization, matcher tests, and graph
materialization tests.
