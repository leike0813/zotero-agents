## ADDED Requirements

### Requirement: Documentation SHALL describe the Concept KB index engine boundary

Active Synthesis documentation SHALL describe Concept KB search, overlay, and
bounded exact-query computation as an environment-neutral engine while
repository, canonical, review, mutation, and public compatibility ownership
remain application-side.

#### Scenario: Current architecture is documented

- **WHEN** active docs describe Concept KB runtime ownership
- **THEN** they SHALL identify `synthesis-engine` as the index/query algorithm owner
- **AND** SHALL NOT claim that proposal matching or production sidecar execution
  has moved.
