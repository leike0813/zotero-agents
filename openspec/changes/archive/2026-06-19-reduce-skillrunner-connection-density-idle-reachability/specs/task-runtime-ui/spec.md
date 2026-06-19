## MODIFIED Requirements

### Requirement: SkillRunner run projection MUST remain visible while observation is degraded

Observation downgrade MUST NOT remove or hide deferred apply/run state.

#### Scenario: deferred apply remains visible during connection pressure

- **WHEN** a SkillRunner run is terminal but deferred apply is pending, retrying, or failed
- **AND** the backend is under connection pressure or degraded observation
- **THEN** dashboard, popover, and run workspace SHALL keep the run projection visible
- **AND** the apply state SHALL remain readable from the SkillRunner run store projection.

#### Scenario: observation skip is not task deletion

- **WHEN** plugin skips background history or reachability requests due to physical debt
- **THEN** plugin SHALL NOT delete task projections or dashboard history
- **AND** UI SHALL keep the last-known state until a critical path updates it.
