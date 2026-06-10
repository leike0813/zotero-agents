## MODIFIED Requirements

### Requirement: Topic details SHALL render review outline and coverage without duplication

Topic Details SHALL interpret the current review outline payload shape without
flattening arbitrary objects into generic steps.

#### Scenario: Review outline is grouped

- **WHEN** `review_outline` contains introduction, related work, body sections,
  sections, outline, or review sections
- **THEN** Topic Details SHALL render deterministic groups for introduction,
  related work, main sections, and other outline notes.

#### Scenario: Coverage content is deduplicated

- **WHEN** coverage, external literature, gaps, and collection suggestions
  contain repeated text
- **THEN** Topic Details SHALL render each distinct coverage idea once.
