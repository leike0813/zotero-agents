# Synthesis Knowledge Graph Topic Graph Design

Date: 2026-05-24

Parent design: `artifact/topic_graph_lightweight_design_20260519.md`

## Scope

Topic Graph 表达 topic 之间的组织关系，并接入 Topic Synthesis，让 agent 在 synthesis 过程中贡献 relation proposals。

本域包括：

- Topic graph node / edge canonical files。
- `broader_than / related_to / overlaps_with / contrasts_with`。
- root / top-level / Unplaced 规则。
- `stage_5_6_topic_graph_relation_proposals`。
- relation proposal ingestion。
- Topics page Graph view。
- Topic Inspector。

本域不包括：

- Citation graph。
- Concept KB。
- Git sync remote。
- 复杂图编辑器。

## Canonical Model

Canonical edge direction:

```text
source_topic_id is broader than target_topic_id
```

`edge_id` deterministic rule:

```text
edge_id = edge:<relation>:<safe-source-topic-id>:<safe-target-topic-id>
```

For `related_to / overlaps_with / contrasts_with`, source and target ids are sorted lexicographically before `edge_id` generation unless a future relation is explicitly directional.

## Agent Proposal Model

Agent writes proposals from current topic perspective. It does not write final edges.

Allowed proposal types:

```text
broader_topic_candidate
related_topic_candidate
overlap_topic_candidate
contrast_topic_candidate
```

Conversion:

```text
broader_topic_candidate:
  target_topic_id broader_than source_topic_id

related_topic_candidate:
  source_topic_id related_to target_topic_id

overlap_topic_candidate:
  source_topic_id overlaps_with target_topic_id

contrast_topic_candidate:
  source_topic_id contrasts_with target_topic_id
```

Agent cannot create `confirmed` edges.

## Stage Placement

```text
stage_5_cross_paper_synthesis
stage_5_5_concept_cards
stage_5_6_topic_graph_relation_proposals
stage_6_validate_final_artifacts
```

Failure policy:

```text
relation proposal ingestion failure should not fail topic synthesis apply
unless the proposal file breaks required output schema validation.
```

## Placement Rules

Root/top-level topics can have no parent. They must be excluded from Unplaced by explicit `is_root`, `level=top`, or user-confirmed top-level placement.

Unplaced includes:

- non-root topics without parent / confirmed placement。
- topics with placement conflicts。
- topics whose parent suggestions are pending。

## UI

Topics page modes:

```text
Hierarchy
Neighborhood
Unplaced
```

High-confidence `broader_topic_candidate` can enter default hierarchy before confirmation if deterministic checks pass, but must retain suggested visual styling.

## Acceptance Criteria

- Agent proposal can be ingested into suggested edge or review queue。
- `broader_than` cycle is rejected or sent to review。
- root topic is not misclassified as Unplaced。
- user-confirmed / rejected edge is not overwritten by agent proposal。
- Topics page defaults to Graph view。

## Dependencies

- Foundation。
- Existing Topic Synthesis artifact lifecycle。

