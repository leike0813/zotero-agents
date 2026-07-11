## ADDED Requirements

### Requirement: Workflow settings expose required parameters

Workflow settings descriptors and rendered forms SHALL preserve workflow parameter required metadata.

#### Scenario: Required field is rendered

- **WHEN** a parameter declares `required: true`
- **THEN** settings surfaces SHALL identify the field as required
- **AND** missing values SHALL not be submitted for workflow execution.

#### Scenario: Host Bridge describes workflow requirements

- **WHEN** workflow describe or requirements returns the parameter schema
- **THEN** each required parameter SHALL retain `required: true` in the returned descriptor.
