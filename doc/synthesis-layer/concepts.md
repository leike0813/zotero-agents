# Concepts

Concept KB stores reusable concept cards, aliases, senses, relations, and topic links. It is a sibling domain of Topics, not a hidden part of topic artifacts.

## Ownership

Concept KB owns:

- concept records and stable concept ids;
- aliases, abbreviations, senses, and disambiguation notes;
- concept-to-concept relations;
- concept-to-topic links after Concept-owned validation/review;
- concept proposal review items and durable accept/reject decisions.

Concept KB does not own:

- topic artifact text;
- topic source manifests or source-check diagnostics;
- topic graph relation facts;
- Zotero/library/artifact facts.

## Proposal Ingestion

Topic synthesis may emit Concept KB input through sidecars. These payloads are proposals, not direct writes to canonical Concept facts.

Canonical proposal DTO families:

| DTO | Required Meaning |
| --- | --- |
| `concept_card_proposal` | Candidate concept label, aliases, short definition, evidence, source topic, and optional merge hints. |
| `topic_concept_link_proposal` | Candidate relation between a topic and a concept, with evidence and confidence/reason. |

Ingestion behavior:

1. Validate payload shape and bounded size.
2. Normalize labels, aliases, and relation endpoints.
3. Compare against existing concepts by exact normalized label, alias, abbreviation, and bounded fuzzy candidates.
4. Materialize high-confidence non-conflicting proposals.
5. Open bounded review items for ambiguous merge/link cases.
6. Record diagnostics for invalid or skipped proposals.

Concept ingestion failure should not roll back a successfully applied topic artifact unless the host apply command explicitly chose all-or-nothing behavior. Partial Concept facts may be committed only after validation; invalid proposals remain diagnostics/review inputs.

## Overlay Context

Topics can read Concept KB through a read facade that returns `concept_overlay_context`.

The overlay DTO should include bounded, read-only context:

- topic id and request scope;
- matched concept cards and aliases;
- concept relation summaries;
- topic-concept link summaries;
- diagnostics such as unavailable, stale cache, or truncated result.

Overlay reads must be bounded by topic id, selected concept ids, neighborhood depth, or result limit. Normal topic list/detail snapshots must not scan the complete Concept KB.

Overlay context is optional:

- topic read/create/update remains usable if overlay is unavailable;
- overlay output must not become a topic source manifest dependency;
- overlay failure must not enqueue topic source-check work or silently rewrite topic content;
- if an agent uses overlay during topic update, that fact can be recorded as workflow input diagnostics, not as a topic freshness baseline.

## Review Actions

Concept review actions map to Concept-owned durable effects:

| Review Action | Durable Effect |
| --- | --- |
| accept concept card | materialized concept record or alias/sense row |
| reject concept card | proposal outcome row, suppressing near-identical proposal repetition |
| merge concept | redirect/merge fact inside Concept KB |
| accept topic-concept link | Concept-owned link fact or review outcome |
| reject topic-concept link | rejected proposal outcome |

These actions may mark Concept overlay/cache projections stale or recommend explicit Concept maintenance. They must not rewrite topic artifacts or topic graph relations. If a concept merge/delete changes overlay results, Topics observe it on the next overlay read.

## Failure Semantics

| Scenario | Concept KB Behavior | Topic Behavior |
| --- | --- | --- |
| Proposal payload invalid | Reject proposal row or record diagnostic; no canonical fact. | Topic artifact apply can remain successful. |
| Candidate merge ambiguous | Open bounded review item. | Topic artifact unchanged. |
| Concept storage failure | Roll back Concept transaction and leave retryable diagnostic. | Topic artifact unchanged unless all-or-nothing apply was selected. |
| Overlay query timeout | Return truncated/unavailable diagnostic. | UI/workflow continues without overlay. |
| Concept merge removes overlay target | Maintain redirect/Needs Attention in Concept KB. | Next overlay read shows updated or empty context. |

## Performance

Concept overlay reads should follow the general UI budgets in [Performance and Scale](./performance-and-scale.md). Proposal ingestion should use bounded candidate pools and indexed label/alias keys; all-pairs concept scans are forbidden on normal apply.
