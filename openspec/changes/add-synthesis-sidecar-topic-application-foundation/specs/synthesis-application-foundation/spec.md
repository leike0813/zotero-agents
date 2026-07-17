## ADDED Requirements

### Requirement: Topic orchestration has one environment-neutral owner
The application package SHALL own strict Topic request rebuilding, materialized asset resolution, complete/patch assembly, canonical apply decisions, list/detail projection, operation phases, and post-commit projection warnings without importing Node, Zotero, Host, UI, plugin service, or workflow runtime modules.

#### Scenario: Plugin and Node fixture share pre-commit decisions
- **WHEN** both compositions receive the same Topic bundle and current hashes
- **THEN** they produce identical validation and optimistic conflict decisions while production persistence remains unchanged
