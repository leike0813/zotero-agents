## MODIFIED Requirements

### Requirement: Topic synthesis artifacts use source paper references

Topic synthesis create and full-update artifacts MUST use `source_papers` as
the source paper table and `source_paper_refs` as the topic-section paper
reference field.

#### Scenario: Complete artifact is source-paper based

- **WHEN** a create or full-update topic synthesis result is applied
- **THEN** the manifest sections include `source_papers`
- **AND** the assembled artifact exposes `source_papers`
- **AND** topic-level references resolve through `source_paper_refs`

#### Scenario: Source refs are validated against source papers

- **WHEN** a topic-level section contains `source_paper_refs`
- **THEN** every referenced value must match a `source_papers[].paper_ref`

### Requirement: Topic details expose source paper data

Topic details DTOs and UI rendering MUST use `source_papers` for literature
reference display and digest lookup.

#### Scenario: Detail UI renders source papers

- **WHEN** a topic detail artifact contains source paper metadata
- **THEN** the details page renders source paper cards and source chips from
  `source_papers` and `source_paper_refs`
