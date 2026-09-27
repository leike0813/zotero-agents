# Spec Delta

## ADDED Requirements

### Requirement: Topic discovery client results SHALL use one concrete candidate DTO

Topic Detail and discovery reject/restore results SHALL use the same concrete `TopicDiscoveryCandidate` DTO. A candidate SHALL identify its hint, originating Topic, literature item, actionable status, and update time; it MAY carry bounded title, score, method, reasons, fallback-metadata, and basis fields. Production client methods MUST NOT expose opaque JSON hint objects or persistence-only matching and outcome payloads.

#### Scenario: Topic Detail is rebuilt
- **WHEN** a ready Topic Detail contains discovery data
- **THEN** its open and rejected arrays contain only strict `TopicDiscoveryCandidate` values
- **AND** each array contains at most 20 candidates

#### Scenario: Discovery command succeeds
- **WHEN** a caller rejects or restores a discovery candidate
- **THEN** the result returns that updated candidate through the same DTO
- **AND** the candidate status matches the committed action

#### Scenario: Discovery hint is absent
- **WHEN** a reject or restore target does not exist
- **THEN** the command result returns a null candidate using the existing not-found domain outcome

