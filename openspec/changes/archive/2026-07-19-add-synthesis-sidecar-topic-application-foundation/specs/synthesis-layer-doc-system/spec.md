## ADDED Requirements

### Requirement: Documentation distinguishes isolated application from production ownership
Current-state Synthesis documentation SHALL describe the shadow Topic application, canonical commit point, post-commit warnings, retired Topic mirror, and deferred remote routing/single-writer cutover without presenting the shadow as production authority.

#### Scenario: Documentation remains current-state only
- **WHEN** operators inspect persistence, runtime, performance, packaging, and Stage 1 documentation
- **THEN** each surface consistently identifies isolated roots and unchanged production owners
