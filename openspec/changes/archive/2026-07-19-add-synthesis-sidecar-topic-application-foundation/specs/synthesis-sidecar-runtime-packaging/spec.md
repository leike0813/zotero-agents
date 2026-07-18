## ADDED Requirements

### Requirement: Topic application artifacts are packaged and fingerprinted
The runtime build, bundle inventory, XPI inspection, and fingerprint SHALL include all Topic application contracts, sources, repository facts, and designated Node adapters.

#### Scenario: Topic application source changes invalidate the runtime
- **WHEN** a fingerprinted Topic application or adapter source changes
- **THEN** the runtime fingerprint changes and exact bundle inventory still passes
