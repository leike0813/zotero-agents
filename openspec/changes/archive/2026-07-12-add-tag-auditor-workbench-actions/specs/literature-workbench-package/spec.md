## ADDED Requirements

### Requirement: Literature Workbench Package SHALL distribute tag-auditor
The built-in literature workbench package MUST register and localize the `tag-auditor` workflow together with its hook and shared tag-compliance module.

#### Scenario: Built-in package loads tag-auditor
- **WHEN** the built-in literature workbench package is loaded
- **THEN** `tag-auditor` SHALL be available as a non-debug workflow
- **AND** its workflow label SHALL resolve through the package locale catalog.
