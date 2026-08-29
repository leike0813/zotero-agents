## ADDED Requirements

### Requirement: Current docs SHALL distinguish canary from production routing
Synthesis documentation SHALL state that graph build has an authenticated
internal worker canary while production graph build remains in process and
production-scale transfer is deferred.

#### Scenario: Runtime documentation is reviewed
- **WHEN** maintainers read runtime, packaging, performance, Citation Graph, README, and Stage 1 progress documentation
- **THEN** they SHALL find the three-operation pool, unchanged wire limits, unchanged production authority, and separate prebuild release gate described consistently
