# Synthesis Knowledge Graph Concept KB Design

Date: 2026-05-24

Parent design: `artifact/topic_graph_lightweight_design_20260519.md`

## Scope

Concept KB 是跨库全局知识库，提供概念解释、动态链接和 future review workflow 的术语基础。

本域包括：

- Concept / Sense / Alias / Relation canonical model。
- `stage_5_5_concept_cards`。
- concept card proposal schema。
- concept ingestion service。
- `topics/<topic_id>/current/concepts.json`。
- BM25 / FTS projection。
- Concepts page。
- concept bubble / dynamic overlay。

本域不包括：

- embedding。
- mention sidecar locator。
- automatic source artifact rewriting。
- complex merge UI。

## Data Model

Concept:

```text
word-form cluster / identity shell
```

Sense:

```text
specific meaning with definition, domain, evidence, topic scope
```

Alias:

```text
canonical alias record controlling search, dynamic links, and disambiguation
```

Concept / Sense `aliases` are denormalized read snapshots. Canonical alias records live under:

```text
synthesis/concepts/aliases/<alias_id>.json
```

## Agent Proposal

Agent writes concept cards only:

```text
runtime/payloads/concept-cards-proposal.json
```

Agent-owned fields:

```text
local_id
label
aliases
concept_type
domain
short_definition
definition
disambiguation
topic_relevance
evidence
relations
merge_hints
confidence
```

Agent cannot write:

```text
concept_id
sense_id
alias_id
relation_id
SQLite fields
Git sync metadata
[[wiki links]]
```

## Concept Relation Hints

Concept proposal relation enum:

```text
used_by
uses
broader_than
narrower_than
related_to
contrasts_with
part_of
has_part
```

These are semantic hints. The ingestion service may accept, normalize, downgrade to review, or drop them.

## Ingestion

The concept ingestion service:

1. validates proposal schema。
2. normalizes labels / aliases / domain。
3. searches exact alias, BM25, token overlap candidates。
4. creates merge decision。
5. writes concept / sense / alias canonical files。
6. writes topic concept links。
7. rebuilds concept projection。

Concept ingestion failure does not fail topic synthesis apply unless required output schema is broken.

## UI Editing Boundary

Concepts page direct edits are limited to display text:

```text
short_definition
definition
usage_note
editorial_note
```

No direct editing of:

```text
concept_id
sense_id
aliases
relations
related_topics
source_refs
mention_refs
status
provenance / confidence / hash
```

`status` is readonly; status changes only via proposal action or internal lifecycle transition.

## Dynamic Overlay

No source text rewrite. UI dynamically links current topic concept matches:

- long alias before short alias。
- one link per sense per paragraph。
- skip code / pre / JSON / math / existing links。
- ambiguous or low-confidence match not linked。
- user can disable overlay。

## Acceptance Criteria

- Topic synthesis can emit concept card proposal。
- Ingestion creates topic concept links without blocking main artifact。
- Concept search works through BM25 / FTS projection。
- Concepts page supports read / search / display-text edit。
- Bubble renders short definition without navigation loss。

## Dependencies

- Foundation。
- Topic Synthesis structured outputs。

