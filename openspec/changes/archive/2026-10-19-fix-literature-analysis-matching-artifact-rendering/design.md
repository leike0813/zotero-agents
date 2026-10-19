# Design

## Context

See proposal.md for the failure and cache history. The JSON renderer validates rendered JSON, while the matching-metadata schema currently describes `{literature_matching_metadata: ...}`. Its unchanged template and public artifact validator use the inner object. Reference/Citation schemas already validate final canonical artifacts; score rendering has its own explicit context validation.

## Goals / Non-Goals

Restore reproducible full rendering from source and prove acceptance after catalog replacement. Keep the existing protocol registry, wire schema, Rust/TS receivers and workflow mappings intact. Windows artifact fallback and diagnostic presentation are separate defects and outside this repair.

## Decisions

- Promote the matching schema's existing inner object to its root. Keep `_render_json` validating final output; restoring context-only validation would weaken the canonical Reference/Citation boundary established by the earlier changes.
- Use two approved test seams: public `finalize_outputs` CLI against a temporary synthetic persisted run, and public catalog construction followed by the existing real workflow/native apply test. Fixture setup may use runtime state writers; assertions observe CLI files/results and public apply/reopen outcomes, not private call order.
- Extend the existing Python test module and native workflow test. Use existing Python dependencies locally; native Node tests validate copied JSON with installed Ajv and acquire no new Python dependency. Parameterize invalid artifact samples.
- Leave version identifiers and `matchingMetadataForApply` unchanged. Skill artifact and wire identifiers describe different boundaries and are already mapped correctly.

## Risks / Trade-offs

- Submodule edits alone are not distributable: retain a dirty submodule until separately authorized upstream commit/gitlink delivery. Do not silently reset it during preflight.
- Old patched caches can hide a source defect: exercise new catalog roots and a changed auxiliary Skill, using synthetic content only.
- Protocol evidence is source/test-identity bound: run current targeted checks and record their limits, without reusing the archived change's completion percentages.

## Migration Plan

No database or historical-result migration. Delivery, once authorized, fixes the submodule commit, updates the parent gitlink and publishes a new content patch through the established workflow. Verify an isolated install with an empty catalog before switching local content. Do not overwrite failed runs or mutate live user caches during implementation.
