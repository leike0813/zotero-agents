## ADDED Requirements

### Requirement: Collection collector semantics remain package-owned

The literature workbench package SHALL own collection selection apply validation and mutation semantics.

#### Scenario: Workflow is packaged

- **WHEN** built-in content manifests are checked or rendered
- **THEN** the collection collector workflow, apply hook, documentation, and locales SHALL be included
- **AND** core workflow runtime modules SHALL NOT contain collection-collector identities or threshold rules.
