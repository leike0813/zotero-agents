## ADDED Requirements

### Requirement: Citation Graph application artifacts are packaged and fingerprinted
The service build, runtime bundle, XPI inventory, and runtime fingerprint SHALL include graph application contracts, orchestration/projection sources, shared repository schema/CRUD, and the Node compute-pool adapter.

#### Scenario: Graph application source changes invalidate runtime freshness
- **WHEN** any packaged graph application source changes
- **THEN** the source fingerprint changes and exact runtime inventory requires its compiled artifact
