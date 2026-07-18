## ADDED Requirements

### Requirement: Documentation distinguishes runtime foundation from production service

Active Synthesis documentation SHALL describe the independent Node service
foundation as development/test-only until packaging, plugin launch, remote
client routing, and production ownership are implemented.

#### Scenario: Developer reads runtime documentation

- **WHEN** current-state docs describe the Node service foundation
- **THEN** they SHALL state that it provides only loopback health, handshake,
  authorization, and lifecycle behavior
- **AND** they SHALL state that production remains on the in-process client and
  plugin-owned storage.
