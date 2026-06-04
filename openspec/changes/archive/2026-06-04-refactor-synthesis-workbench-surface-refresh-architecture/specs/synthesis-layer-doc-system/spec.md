## ADDED Requirements

### Requirement: Docs define Workbench surface refresh architecture
Active Synthesis documentation SHALL describe Shell, Chrome, and Surface read models as the Workbench UI architecture.

#### Scenario: Developer reads Workbench docs
- **WHEN** a developer reads active Synthesis Workbench documentation
- **THEN** the docs SHALL state that full snapshot reads are debug-only
- **AND** they SHALL define allowed surface invalidation and progress update behavior.
