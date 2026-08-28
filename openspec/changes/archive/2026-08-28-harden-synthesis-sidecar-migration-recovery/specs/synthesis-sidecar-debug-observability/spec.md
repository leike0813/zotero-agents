## ADDED Requirements

### Requirement: Production startup diagnostics SHALL be bounded and safe
The runtime and supervisor SHALL expose a correlated startup trace containing bounded phase, outcome, stable code, attempt, timing, and safe identity fields. Raw stdout, stderr, command arguments, environment values, and filesystem contents SHALL remain unavailable unless debug mode is enabled.

#### Scenario: Production migration fails
- **WHEN** a migration phase fails while debug mode is disabled
- **THEN** diagnostics identify classification, normalization, validation, publication, discovery, health, handshake, retry, or fuse phase as applicable
- **AND** contain no raw process tail or secret-bearing launch value

#### Scenario: Debug launch fails
- **WHEN** the same launch fails while debug mode is enabled
- **THEN** the bounded trace remains available
- **AND** bounded raw process tails may be attached as debug-only evidence

