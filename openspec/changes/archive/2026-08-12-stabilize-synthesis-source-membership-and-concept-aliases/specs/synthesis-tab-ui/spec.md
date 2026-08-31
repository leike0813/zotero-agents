## ADDED Requirements

### Requirement: Concepts page exposes alias audit and resolution controls

The Concepts page SHALL let the user run the deterministic alias audit and resolve each resulting review item without direct record editing.

#### Scenario: User starts alias audit

- **WHEN** the user invokes the alias audit action
- **THEN** Workbench SHALL run the canonical Concept KB audit
- **AND** refresh concepts and review state with a concise result summary.

#### Scenario: Alias audit item is displayed

- **WHEN** an open review item has reason `alias_conflict` or `alias_equivalence_audit`
- **THEN** the review UI SHALL identify the alias and owning concept
- **AND** expose Keep alias and Remove alias actions
- **AND** hide create/merge actions that do not apply to alias audit.
