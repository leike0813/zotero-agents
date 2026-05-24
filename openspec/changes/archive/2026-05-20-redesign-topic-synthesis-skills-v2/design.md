# Design: Topic Synthesis Skills v2

## Skill Shape

Both skills follow the same structure as `literature-digest`:

1. Core execution instructions
2. Input/output hard contract
3. SQLite runtime state source of truth
4. State machine and gate discipline
5. LLM/script responsibility boundary
6. Shared parameter vocabulary
7. Minimal executable main path
8. Stage-specific optional references

`SKILL.md` is the minimum executable contract. References can expand field
semantics and examples but cannot be the only place a hard rule appears.

## Runtime Model

SQLite stores:

- stage state
- runtime inputs
- action receipts
- artifact registry rows
- hashes and progress metadata

SQLite does not store long semantic content. Content is authored as JSON files in
the run workspace, validated by `stage_runtime.py`, and registered in SQLite.

## v2 Stage Model

- `stage_0_runtime_setup`
- `stage_1_topic_context`
- `stage_2_resolver_and_workset`
- `stage_3_graph_metrics`
- `stage_4_evidence_collection`
- `stage_5_paper_units`
- `stage_6_cross_paper_map`
- `stage_7_route_timeline`
- `stage_8_core_sections`
- `stage_9_external_statistics_report`
- `stage_10_render_and_validate`
- `stage_11_completed`

The implementation may internally reuse existing validation functions, but gate
and skill-facing state names use this v2 model.

## Gate Contract

Every gate response includes:

- `status`
- `stage`
- `next_action`
- `core_instruction`
- `execution_note`
- `command_example`
- `required_reads`
- `required_writes`
- `instruction_refs`
- `schema_refs`
- `progress`

The agent must execute exactly the returned `next_action`.

## Final Product

The final bundle is structured-only:

- create/update full: `result/topic-analysis.json`, `result/result.json`
- update patch: `result/topic-analysis.patch.json`, `result/result.json`

The skill runtime does not generate `preview.md`, `export.md`, or
`markdown_path`. Host apply renders canonical `current/export.md`.
