## Why

The Synthesis runtime currently exposes a 126-method in-process service that mixes application orchestration, Zotero access, persistence, canonical files, compute, and UI projections. Before moving any production ownership to a sidecar process, the repository needs one auditable migration boundary, a complete API disposition inventory, and repeatable baseline gates that prevent dual ownership or an unbounded remote god object.

## What Changes

- Define the migration governance contract for the staged Synthesis sidecar extraction, including ownership, dependency direction, protocol grouping, failure semantics, cutover gates, and rollback limits.
- Add a machine-readable inventory that classifies every current public Synthesis service method, records its production consumers, and assigns a target capability or deletion disposition.
- Repair and strengthen the existing Synthesis invariant test command so the current baseline is reproducible before implementation moves.
- Add small, text-based migration fixtures and a baseline report for schema, canonical-topic layout, representative inputs, and existing performance/test evidence.
- Reconcile active documentation where it currently conflates workflow artifacts, Topic canonical current files, and Zotero note mirrors, while continuing to describe the implementation as in-process until a later change actually cuts it over.
- Establish stable invariant identifiers for later changes without adding premature active invariants that lack executable evidence.

## Capabilities

### New Capabilities

- `synthesis-sidecar-service-boundary`: Governs the staged extraction of Synthesis into a per-profile sidecar, including single-owner data rules, bounded contracts, host isolation, compute isolation, failure behavior, and cutover prerequisites.

### Modified Capabilities

None. Existing runtime behavior remains in-process in this change; later implementation changes will modify the relevant active capabilities when their behavior actually changes.

## Impact

- OpenSpec and active Synthesis architecture documentation.
- Synthesis invariant tests and the `test:synthesis:invariants` package script.
- New migration inventory, baseline report, and text fixtures.
- No production service, repository, DB ownership, canonical file ownership, Workbench routing, or Zotero host behavior changes.
