## ADDED Requirements

### Requirement: Isolated repository persists narrow Topic application state
The environment-neutral repository and Node adapter SHALL persist strict Topic registry, Topic Graph, Concept, Topic Concept, interest metadata, and discovery projection records required by the Topic application, using indexed bounded reads and short transactions.

#### Scenario: Topic state survives restart
- **WHEN** Topic application records are committed and the same isolated repository identity is reopened
- **THEN** every strict record is available without production database access or canonical directory scanning
