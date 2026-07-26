## ADDED Requirements

### Requirement: Workflow docs SHALL distinguish consumption from production
Current-state developer and user documentation SHALL explain in separate sections that `inputs` defines the execution consumer contract and `validateSelection` defines candidate production, filtering, and cardinality.

#### Scenario: Author reads workflow manifest guidance
- **WHEN** documentation introduces v2 input planning
- **THEN** it does not describe inputs and validation as interchangeable first-stage and advanced filters

### Requirement: Workflow docs SHALL describe v2 semantics completely
Documentation SHALL cover required triggers, member kinds, selector policies, filter phases and order, candidate requirements, deterministic grouping, prepared units, duplicate/queue boundaries, and summary statistics.

#### Scenario: Author configures parent grouping
- **WHEN** documentation shows a parent-grouped attachment workflow
- **THEN** it explains stable parent identity, orphan skipping, member order, and top-level concurrency

### Requirement: Embedded workflow help SHALL be generated
Localized site workflow documentation SHALL be updated from current-state sources and embedded `addon/content/help-docs` output SHALL be produced by the repository generator rather than direct edits.

#### Scenario: Help-doc checks run
- **WHEN** workflow documentation changes are complete
- **THEN** generated help and localization governance checks pass
