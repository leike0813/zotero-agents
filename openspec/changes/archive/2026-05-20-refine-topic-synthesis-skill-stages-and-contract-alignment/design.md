# Design: Refined Topic Synthesis Skill Stages

## Stage Split

The Stage 5 cross-paper synthesis flow becomes:

1. `export_cross_paper_context`
2. `draft_cross_paper_evidence_map`
3. `draft_route_and_timeline_synthesis`
4. `draft_core_analytical_sections`
5. `draft_external_statistics_and_report`
6. `validate_final_artifacts`

The runtime remains deterministic infrastructure. It validates payload shape,
stores action receipts, registers paths and hashes, and verifies reference
closures. It does not write substantive analysis text.

## Structured Contract

New outputs must use:

- `taxonomy.summary` plus `taxonomy.nodes`.
- `timeline_events.summary` plus `timeline_events.events`.
- `synthesis_report.source_section_chapters.research_routes =
  "taxonomy.summary"`.
- `synthesis_report.source_section_chapters.historical_progression =
  "timeline_events.summary"`.

Legacy timeline arrays may be tolerated by readers for old artifacts, but new
skill output and runtime validation should target the object shape.

## Skill References

The repo-level `doc/topic-synthesis-content-contract.md` is split into
skill-local references. Gate JIT prompts point to the minimal relevant reference
for the current action so the agent does not need to hold the entire contract in
context.

## Frontend Alignment

Topic Detail should render route and timeline summaries as first-class reading
surfaces before route cards and timeline markers. Timeline markers come from
`timeline_events.events`.
