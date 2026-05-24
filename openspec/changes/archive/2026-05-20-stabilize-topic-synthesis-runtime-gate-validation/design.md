# Design: Topic Synthesis Runtime/Gate Stabilization

## Runtime Contract

The public skill-facing contract uses only v2 stage names and canonical actions.
Legacy action names may remain as internal compatibility aliases, but receipts
and gate progress use canonical names.

`persist_paper_units` is the canonical batch paper-unit action. Its payload is a
JSON object with `analyses[]`. The gate must accept the resulting `paper_refs[]`
receipt as proof that the workset's paper units were persisted.

## Integrity Audit

The runtime exposes an integrity audit that is run by gate and final validation.
It checks stage monotonicity, action receipt shape, canonical receipt names,
registry/section hash consistency when a run root is available, and impossible
state combinations such as early stages still running while later stages are
completed.

## Final Validation

`validate_final_artifacts` assembles the final section artifact in memory and
validates referential integrity before writing final manifests/results. The
runtime checks both paper evidence references and final `evidence_map` closure:
all `evidence_map_refs` in taxonomy, timeline, claims, comparison, debates,
gaps, and review outline must exist in final `evidence_map.candidate_ids`.

If validation fails, no final stdout bundle is written or registered.
