## MODIFIED Requirements

### Requirement: Suggested topic graph relations are reviewable

Synthesis Topic Graph SHALL allow Workbench users to accept or reject suggested relation edges through canonical transactions.

#### Scenario: Suggested edge is accepted

- **WHEN** a suggested edge is accepted by edge id
- **THEN** the canonical edge status SHALL become `confirmed`
- **AND** provenance and evidence SHALL be preserved
- **AND** `topic-graph-index` SHALL be marked stale.

#### Scenario: Suggested edge is rejected

- **WHEN** a suggested edge is rejected by edge id
- **THEN** the canonical edge status SHALL become `rejected`
- **AND** later proposal ingestion SHALL NOT overwrite that decision.

#### Scenario: Invalid edge decision is diagnostic-only

- **WHEN** a missing edge or non-suggested edge is reviewed
- **THEN** the service SHALL return a structured diagnostic
- **AND** no canonical graph rows SHALL be changed.

#### Scenario: Low-confidence review approval is terminal

- **WHEN** an open low-confidence review item is approved
- **THEN** the canonical edge for that tuple SHALL become `confirmed` in the
  same transaction
- **AND** the review item SHALL become `approved`
- **AND** no `suggested` edge SHALL remain for that tuple.

#### Scenario: Approved hierarchy review cascades discovery candidates

- **WHEN** an open review item whose relation is `broader_than` is approved and
  the confirmation commits
- **THEN** the persisted topic discovery cascade SHALL be refreshed exactly as
  for a direct edge acceptance
- **AND** a refresh failure SHALL be reported as a post-commit warning without
  rolling back the confirmed edge.

#### Scenario: Non-hierarchy review approval skips the discovery refresh

- **WHEN** an open review item whose relation is not `broader_than` is approved
- **THEN** the persisted topic discovery cascade SHALL NOT be refreshed.
