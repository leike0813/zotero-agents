## ADDED Requirements

### Requirement: Topic promotion SHALL preserve proposal and consumer data
Topic apply SHALL persist prospective proposals in canonical metadata and preserve Concept proposal metadata, structured coverage, summary text and source triage. Canonical data and derived Topic projections SHALL be validated before promotion so accepted input cannot make ordinary Topic reads undecodable.

#### Scenario: Prospective sidecar is applied and reopened
- **WHEN** a full apply includes prospective proposals and the service restarts
- **THEN** audit and review return the saved proposals from canonical metadata.

#### Scenario: Prospective patch semantics are explicit
- **WHEN** a patch omits prospective proposals
- **THEN** the previous proposals are inherited
- **AND WHEN** a patch supplies an empty proposal list
- **THEN** the saved proposal list is empty.

#### Scenario: Rich content is read
- **WHEN** a Topic contains structured coverage, a summary body and source-paper triage
- **THEN** default review input accepts the canonical artifact and Reader consumers receive complete summary and coverage entries.

#### Scenario: Invalid projection input is submitted
- **WHEN** new Topic input violates its declared canonical or projection shape
- **THEN** apply rejects it before canonical promotion without poisoning subsequent reads.
