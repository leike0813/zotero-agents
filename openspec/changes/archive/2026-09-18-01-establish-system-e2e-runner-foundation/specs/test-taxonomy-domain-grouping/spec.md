# Spec Delta

## MODIFIED Requirements

### Requirement: Test inventory SHALL be classified into standard domains
The project test inventory SHALL be classified into `core`, `ui`, `workflow-*`, and `e2e` domains. The
`e2e` domain SHALL own the project-wide catalog suite under `tests/zotero/e2e/full`. Behavioral
classification SHALL remain independent of directory names, so tests in another primary domain MAY
still provide System E2E evidence for their public production path.

#### Scenario: Existing test is assigned to one primary domain
- **WHEN** a test file is reviewed during migration
- **THEN** it is assigned to exactly one primary domain

#### Scenario: New test follows domain taxonomy
- **WHEN** a new test is added
- **THEN** its location and naming comply with the domain taxonomy rules

#### Scenario: Catalog case is placed in the E2E domain
- **WHEN** an approved project-wide Scenario Case is implemented
- **THEN** it is placed under `tests/zotero/e2e/full`
- **AND** it does not create a second System E2E runner or domain

#### Scenario: Existing public-path evidence stays in another domain
- **WHEN** a `core`, `ui`, or `workflow-*` test traverses a public production path through real Zotero and the production plugin
- **THEN** it MAY remain classified as System E2E evidence for that path
- **AND** its primary domain does not change solely because of the behavioral classification

## ADDED Requirements

### Requirement: System E2E identity SHALL NOT replace domain grouping

A System E2E Scenario Family label and Scenario Case ID SHALL be execution-catalog identity, not a test
domain or runtime affinity. A Scenario Family label records the production module that owns the
family's semantics and MAY span files within the `e2e` domain, while every test file SHALL still hold
exactly one primary domain and at most one runtime affinity. Naming and maintenance ownership of the
`e2e` domain SHALL follow the same domain standards as `core`, `ui`, and `workflow-*`.

#### Scenario: Family label does not change domain ownership

- **WHEN** a test file is assigned to a Scenario Family
- **THEN** it remains assigned to exactly one primary domain
- **AND** the family label adds catalog identity without creating a new domain or runtime affinity

#### Scenario: E2E domain has documented standards

- **WHEN** the `e2e` domain is reviewed
- **THEN** its naming conventions and maintenance ownership expectations are documented alongside the
  other standard domains
