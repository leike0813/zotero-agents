## ADDED Requirements

### Requirement: Context request payloads SHALL include semantic intent

The `literature-deep-reading` skill SHALL require Stage 10 context request
payloads to include enough semantic intent for Host context collection.

#### Scenario: Context request is missing semantic anchors

- **WHEN** `validate-context-request` checks a payload without non-empty
  `main_task` or `method_family`
- **THEN** validation SHALL fail.

#### Scenario: Optional context request lacks required intent

- **WHEN** `request_topic_context` is true without `topic_context_reason`
- **OR** `request_concept_context` is true without `concept_labels`
- **OR** `reference_digest_policy` is `priority_only` without
  `priority_reference_indices`
- **THEN** validation SHALL fail.

### Requirement: Reading enrichment payloads SHALL meet minimum semantic content

The `literature-deep-reading` skill SHALL require Stage 20 reading enrichment
payloads to provide the minimum content needed for a useful reader-first HTML
experience.

#### Scenario: Preface cards are incomplete

- **WHEN** `validate-reading-enrichment` checks a payload whose preface cards do
  not match the four stable slots
- **THEN** validation SHALL fail.

#### Scenario: Section notes are incomplete

- **WHEN** `validate-reading-enrichment` checks a section note missing a
  reading goal, warning list, question list, citation note body, or citation
  reference role list
- **THEN** validation SHALL fail.

#### Scenario: Concept or reference notes are incomplete

- **WHEN** an agent-supplied concept lacks `definition`
- **OR** a reference digest note lacks `role_in_current_paper` or `why_open`
- **THEN** validation SHALL fail.

### Requirement: Citation role guidance SHALL remain recommended not enumerated

The skill instructions SHALL recommend citation role terms from
`literature-analysis`, but the runtime SHALL NOT reject a non-empty custom role
solely because it is outside the recommended examples.

#### Scenario: Custom citation role is non-empty

- **WHEN** `validate-reading-enrichment` checks a citation reference role with a
  known `reference_id` and a non-empty custom `role`
- **THEN** validation SHALL allow that role value.

### Requirement: Translation and final review validation SHALL use runtime-owned checks

The Stage 30 instructions SHALL direct agents to collect batch JSON, merge,
submit, validate, and repair by runtime error. Final review validation SHALL
check assessment consistency.

#### Scenario: Final review assessment is inconsistent

- **WHEN** `overall_assessment` is `needs_revision` without warning/error
  observations
- **OR** `overall_assessment` is `ready` with an error observation
- **THEN** validation SHALL fail.
