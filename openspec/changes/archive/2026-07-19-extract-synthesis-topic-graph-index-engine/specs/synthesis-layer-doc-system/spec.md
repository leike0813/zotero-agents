## ADDED Requirements

### Requirement: Documentation SHALL describe the Topic Graph index engine boundary

Active Synthesis documentation SHALL describe root and unplaced-topic index
derivation as an environment-neutral engine while repository, canonical,
review, mutation, UI filtering, and projection compatibility ownership remain
application-side.

#### Scenario: Current architecture is documented

- **WHEN** active docs describe Topic Graph runtime ownership
- **THEN** they SHALL identify `synthesis-engine` as the index algorithm owner
- **AND** SHALL NOT claim that proposal/review logic or production sidecar
  execution has moved.
