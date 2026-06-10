# Core Synthesis Taxonomy And Timeline Notes

Taxonomy and timeline are authored inside `persist_core_synthesis`.

## Taxonomy

`taxonomy` should contain:

- `summary`: route-level overview.
- `nodes[]`: route definitions, mechanisms, strengths, limitations, maturity, route relations, and `source_paper_refs`.

## Timeline

`timeline_events` should contain:

- `summary`: historical progression overview.
- `events[]`: milestone descriptions, phase/progression logic, historical role, follow-on effect, and `source_paper_refs`.

Runtime derives timeline markers from timeline events, source paper refs, paper evidence, and paper metadata.
