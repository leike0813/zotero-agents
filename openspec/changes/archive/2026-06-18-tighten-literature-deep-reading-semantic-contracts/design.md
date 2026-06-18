# Design

## Validation split

JSON schemas express static shape: required fields, non-empty strings, minimum
array sizes, and basic numeric ranges. Runtime validators express conditions
that depend on runtime views or multiple fields, such as selected topic
validity, known section anchors, known reference ids, and final-review
assessment consistency.

## Stage 10 context request

`main_task` and `method_family` become required semantic anchors. Optional
requests must include their own intent:

- topic context requires `topic_context_reason`
- concept context requires at least one `concept_labels` entry
- citation graph requests must submit depth, direction, node limit, and edge
  limit explicitly
- `priority_only` digest policy requires at least one priority reference index

When topic candidates are available, a non-empty `selected_topic_id` must match
one of them.

## Stage 20 reading enrichment

The payload must include the minimum content needed to render a useful reading
experience:

- exactly four preface cards with the stable titles
- reading path, goal, and questions
- at least one section note with a reading goal, warning list, question list,
  citation note body, and citation role list
- concept definitions for any agent-supplied concepts
- complete reference digest notes when reference notes are supplied

`citation_reference_roles[].role` remains a free-form semantic label. The skill
instructions recommend role terms derived from `literature-analysis`, but the
runtime only requires a non-empty role and a known `reference_id`.

## Stage 30 and final review

Stage 30 instructions should not duplicate deterministic runtime validation.
The agent collects batch JSON, merges reviewed results, submits, validates, and
repairs by `block_id` from runtime errors.

Final review gains consistency checks: `needs_revision` must include at least
one warning/error observation, and `ready` cannot include error observations.
