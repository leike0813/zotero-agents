## MODIFIED Requirements

### Requirement: SkillRunner transcript publication SHALL follow execution display policy without owner navigation

Live mode SHALL publish each visible canonical chat mutation with an advancing transcript revision. Boundary mode MAY retain partial chunks but SHALL release them at a semantic message, waiting, or terminal boundary. Owner navigation SHALL NOT be required for either mode to converge.

#### Scenario: Live count and transcript advance together

- **WHEN** a selected live-mode run receives a visible chat event
- **THEN** the first snapshot reflecting its message count also contains the corresponding transcript state and revision.

#### Scenario: Boundary mode reaches assistant final

- **WHEN** held chunks reach an assistant-final boundary
- **THEN** the complete message is published without switching tasks.
