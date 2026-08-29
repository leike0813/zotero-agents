## ADDED Requirements

### Requirement: Synthesis docs SHALL describe large-transfer staging truthfully
Active documentation SHALL distinguish the authenticated JSON-page staging canary from packed worker execution and production graph-build routing.

#### Scenario: Runtime documentation is read
- **WHEN** a maintainer reviews Synthesis runtime, packaging, performance, README, and Stage 1 progress documentation
- **THEN** it states the exact transfer limits and ownership boundary, records that the compute worker remains unconnected, and identifies packed worker integration as the next change

#### Scenario: Migration documentation is read
- **WHEN** a maintainer inspects the service API migration inventory
- **THEN** Citation Graph Build is marked as a transfer/worker canary but remains `production_worker: false`
