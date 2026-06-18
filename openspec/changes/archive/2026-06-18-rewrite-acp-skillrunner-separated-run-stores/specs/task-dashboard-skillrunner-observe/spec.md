## MODIFIED Requirements

### Requirement: SkillRunner UI projection MUST derive from SkillRunner run store

Dashboard, Task Manager, and SkillRunner workspace UI MUST treat the
SkillRunner run store as the source for SkillRunner task projections.

#### Scenario: terminal run remains visible

- **WHEN** a SkillRunner run reaches terminal success, failure, or cancellation
- **THEN** UI history SHALL keep a visible projection derived from the
  SkillRunner run store
- **AND** terminal observation SHALL stop stream, poll, and interaction loops for that request.

#### Scenario: run-level client error is not backend gating

- **WHEN** a known SkillRunner request returns `400`, `404`, `410`, or `422`
- **THEN** plugin SHALL settle that run as failed in the SkillRunner run store
- **AND** plugin SHALL NOT mark the backend unreachable solely from that run-level error.

