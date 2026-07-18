## ADDED Requirements

### Requirement: Documentation distinguishes wire capacity from production routing
Current-state Synthesis documentation SHALL describe the 8 MiB compute
envelope, unchanged engine bounds, and unchanged in-process production owner.

#### Scenario: Reader evaluates sidecar readiness
- **WHEN** a maintainer reads runtime, performance, packaging, README, and Stage 1 progress documentation
- **THEN** the maintainer can distinguish transport-capacity readiness from a completed production layout cutover
