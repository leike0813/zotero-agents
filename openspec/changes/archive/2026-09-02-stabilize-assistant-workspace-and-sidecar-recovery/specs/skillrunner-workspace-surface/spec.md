## ADDED Requirements

### Requirement: SkillRunner activation SHALL reuse refresh-triggered initialization

SkillRunner SHALL retain its attach, refresh, and explicit initialize sequence,
while the shared runtime SHALL collapse the refresh notification and explicit
activation into one observable baseline for the same request/run owner.

#### Scenario: Refresh selects a new run during activation
- **WHEN** refresh publishes the selected-run change before explicit activation returns
- **THEN** the child receives one navigation, one loading transcript, and one ready transcript baseline
