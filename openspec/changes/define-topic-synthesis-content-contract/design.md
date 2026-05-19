# Design: Topic Synthesis Content Contract

## Contract Shape

The change preserves existing section keys to avoid broad UI and persistence
churn. The semantic contract is strengthened in-place:

- `topic` defines the topic concept, discipline, research field, aliases, and
  scope boundary.
- `taxonomy` is research-route analysis, not a shallow taxonomy. Each node must
  explain route definition, core problem, mechanism, representative papers,
  strengths, limitations, maturity, and relation to other routes.
- `timeline_events` captures historical progression. Events should explain why
  a milestone mattered and how it changed or enabled later work.
- `claims` are argued synthesis findings with evidence, analysis, scope,
  confidence, and limitations.
- `external_literature_analysis` is an independent analysis of external
  references, not a summary string. It must include themes, representative
  references, citation contexts, coverage judgment, and suggested additions.
- `statistics` records quantitative and semi-quantitative topic indicators.
- `synthesis_report` provides a continuous human-readable report assembled from
  the structured sections.

## Validation Strategy

Host and runtime validation remain structural rather than prose-quality
judgment, but they reject the most common empty-shell outputs:

- Missing topic discipline/field/scope boundary.
- Taxonomy nodes without route analysis fields.
- Claims without explanation and limitations/scope.
- Timeline rows without description/phase.
- External literature analysis without coverage verdict and suggested additions.
- Missing statistics or synthesis report.

The deeper prose quality remains enforced through skill instructions and
section authoring examples.

## Skill Authoring

Create/update skills must describe the content contract directly in `SKILL.md`.
The optional section authoring reference provides richer examples, but hard
requirements stay in the skill entrypoint and schema/runtime validators.
