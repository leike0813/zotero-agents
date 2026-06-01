## MODIFIED Requirements

### Requirement: Bulk drift uses documented relaxed thresholds

Startup reconcile SHALL classify bulk drift when changed known items are greater than 50 or greater than 5% of active library items.

#### Scenario: Absolute threshold is exceeded

- **WHEN** startup reconcile detects 51 changed known items in an active library of 1000 items
- **THEN** it SHALL record a bulk drift incident
- **AND** it SHALL NOT fan out per-item dirty events.

#### Scenario: Percentage threshold is exceeded

- **WHEN** startup reconcile detects 2 changed known items in an active library of 20 items
- **THEN** it SHALL record a bulk drift incident.

#### Scenario: Threshold is not exceeded

- **WHEN** startup reconcile detects 50 changed known items in an active library of 1000 items
- **THEN** it SHALL queue scoped dirty events for those changed items.
