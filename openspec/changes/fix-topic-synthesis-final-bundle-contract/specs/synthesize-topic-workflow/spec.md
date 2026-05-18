## ADDED Requirements

### Requirement: Host apply resolves path-based resolver state

The host MUST read `resolver_manifest_path` from the run workspace and recover
resolver state and resolved paper set for canonical persistence.

#### Scenario: valid path-based final bundle

- **WHEN** the final bundle contains a valid topic definition and resolver manifest path
- **THEN** apply persists topic definition, resolver state, resolved paper set, and topic artifact
