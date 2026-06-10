# Topic Synthesis Content Contract

本文件描述当前 topic synthesis 内容层的语义标准；执行硬约束以 `SKILL.md`、gate 输出和 schema 为准。

## Agent-authored stage payloads

- Stage 5 `persist_paper_triage`: per-paper `topic_relevance`, `paper_quality`, and `core_digest`.
- Stage 7 `persist_core_synthesis`: `taxonomy`, `timeline_events`, `positioning`, `claims`, `improvement_dimension_summary`, `improvement_dimensions`, `concept_candidate_labels`, `debates`, `gaps`, and `review_outline`.
- Stage 8 `persist_kg_enrichment`: `concept_details[]`, `topic_relation_candidates[]`, and `topic_matching_terms`.
- Stage 9 `finalize_summary_coverage`: `summary`, `coverage`, `reliability_caveats`, `external_context_summary`, `collection_suggestions`, and `diagnostics`.

## Evidence discipline

Agent-authored analytical objects use `source_paper_refs` from the resolved paper set where paper evidence is needed. Runtime validates those refs and materializes paper evidence ids, evidence refs, evidence map refs, timeline markers, source artifacts, statistics, sidecars, and the final report.

## Core synthesis standards

- `taxonomy` explains research routes, route boundaries, mechanisms, maturity, strengths, limitations, and relations.
- `timeline_events` explains historical progression and milestone logic.
- `positioning` defines field importance, review angle, and scope boundary.
- `claims` state topic-level findings with scope and limits.
- `improvement_dimensions[]` explains progress dimensions, design tradeoffs, and evaluation axes.
- `debates` names positions, evaluation axis, and current judgment.
- `gaps` separates research gaps, evidence gaps, evaluation gaps, and collection coverage gaps.
- `review_outline` turns the synthesis into a usable writing plan.

## Final materialized sections

The runtime writes complete final sections under `result/sections/*.json`, including provenance, statistics, source artifacts, KG sidecars, and `synthesis_report`. The final candidate envelope is `result/final-output.candidate.json`.
