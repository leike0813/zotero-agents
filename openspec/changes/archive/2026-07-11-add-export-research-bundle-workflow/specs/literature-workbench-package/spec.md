## ADDED Requirements

### Requirement: Research bundle semantics remain package-owned

The literature workbench package SHALL own research selection validation, Markdown dependency collection, v2 payload export, Product manifest rendering, and warning codes.

#### Scenario: Workflow is packaged

- **WHEN** builtin content manifests are rendered
- **THEN** the workflow, hooks, shared module, locale labels, and documentation SHALL be included
- **AND** core workflow modules SHALL NOT contain research-bundle identities or literature payload recognition rules.
