# Spec Delta

## ADDED Requirements

### Requirement: Backend Manager SHALL expose independent Built-in Agent configuration

The existing Backend Manager SHALL expose a fourth Built-in Agent page with Pi configurations, redacted credential status, catalog status, and scoped defaults. Pi actions SHALL persist independently of Backend Profile rows and SHALL leave ACP, SkillRunner, and Generic HTTP actions unchanged.

#### Scenario: Save a Pi configuration
- **WHEN** the user saves or disables a Pi configuration on the Built-in Agent page
- **THEN** the Pi state is updated and the existing Backend Profile configuration is unchanged

#### Scenario: No usable configuration exists
- **WHEN** the catalog or selected configuration is incomplete or unavailable
- **THEN** the page displays that state without offering an execution action
