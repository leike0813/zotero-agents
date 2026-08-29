## ADDED Requirements

### Requirement: Documentation reflects two production compute routes
The Synthesis documentation SHALL describe layout and metrics as sidecar worker
routes and the remaining six engines as in-process routes across runtime,
supervision, packaging, performance, README, and Stage 1 guidance.

#### Scenario: Documentation governance runs
- **WHEN** help and architecture documentation checks execute
- **THEN** the documented topology, ownership boundary, no-fallback policy, and separate prebuild release gate match the implementation
