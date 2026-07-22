## ADDED Requirements

### Requirement: Workflow manifests SHALL declare purpose descriptions
Every loadable workflow manifest SHALL provide a non-empty description that explains the task outcome rather than repeat the workflow id or label.

#### Scenario: Description is missing
- **WHEN** a workflow manifest omits or supplies a blank description
- **THEN** schema or loader validation rejects the manifest with a deterministic diagnostic.

### Requirement: Workflow manifests SHALL declare execution modes explicitly
Workflow execution-mode support SHALL be an explicit manifest/runtime fact and SHALL NOT be inferred from parameter required flags by renderers.

#### Scenario: Workflow requires host-only options
- **WHEN** a workflow declares required options unavailable to agent-owned handoff
- **THEN** its manifest declares agent-owned execution unsupported
- **AND** generated catalogs preserve that declaration.
