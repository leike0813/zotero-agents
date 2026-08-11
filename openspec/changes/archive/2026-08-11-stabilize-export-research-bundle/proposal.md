## Why

`export-research-bundle` currently treats a successful Host Bridge call as successful literature discovery even when the query returns no items or returned rows cannot become canonical paper references. Because Stage 50 then advances with zero assessment batches, technical discovery failures and low-recall searches are often misreported as `no_related_literature` cancellations.

The workflow's paper-count limits are also too restrictive for larger research bundles, while its live number inputs neither expose their allowed range nor reject out-of-range and fractional values before submission.

## What Changes

- Replace free-form library-search phrases with a structured metadata-anchor plan whose primary and fallback anchors are semantically chosen by the Agent and deterministically executed by the runtime.
- Use the existing pageable library-items query to build a bounded, auditable candidate workset before Stage 50 assessment.
- Persist a discovery summary that distinguishes usable candidates, confirmed-empty discovery, and incomplete discovery; only confirmed evidence states may produce `no_related_literature`.
- Normalize Topic resolved-paper references through their defined slots, preserve query/topic provenance, and surface stable diagnostics for dropped rows, unavailable sources, pagination truncation, and candidate-budget truncation.
- Raise `maxTopics`, `maxCorePapers`, and `maxRelatedPapers` maxima to 10, 50, and 200 while retaining defaults of 5, 20, and 80.
- Add reusable integer/range validation and dynamic range labels to the two live Workflow parameter forms so invalid values cannot be submitted or auto-saved.
- Synchronize the Skill's current-state stage instructions, scoring formula, workflow documentation, and user documentation with the executable contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-bundle-workflow`: Define bounded metadata-anchor discovery, auditable discovery outcomes, cancellation preconditions, and enlarged validated export limits.

## Impact

- Affects the built-in `export-research-bundle` Skill runtime, gate guidance, schemas, and documentation.
- Extends the generic Workflow number-parameter descriptor with an integer constraint and shares browser-side number validation across Dashboard parameter surfaces.
- Uses existing Host Bridge `library items list` pagination; no Host Bridge capability or agent-facing surface changes are required.
- Does not change the successful or canceled top-level Research Bundle output kinds and does not add SQLite tables.
