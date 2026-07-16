## ADDED Requirements

### Requirement: Documentation SHALL describe the Topic Structured Artifact engine boundary

Current-state Synthesis documentation SHALL identify structured artifact
validation, assembly, and patch computation as engine-owned and identify
workspace IO, Host checks, hashing, canonical promotion, and downstream effects
as application-owned.

#### Scenario: Engineer reads the architecture documentation
- **WHEN** an engineer reviews Synthesis engine and topic lifecycle documentation
- **THEN** the documented dependency direction, failure behavior, bounds, and production topology SHALL match the implemented current state.
