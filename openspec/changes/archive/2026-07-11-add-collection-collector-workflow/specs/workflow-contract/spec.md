## ADDED Requirements

### Requirement: Workflow parameters may be required

Workflow manifests SHALL support `parameters.<key>.required` as an optional boolean contract.

#### Scenario: Required values are present

- **WHEN** a required string is non-blank, a required number is finite, or a required boolean is either true or false
- **THEN** workflow parameter validation SHALL accept the value.

#### Scenario: Required values are missing

- **WHEN** one or more required workflow parameters are absent or blank
- **THEN** execution SHALL fail before provider dispatch
- **AND** the structured error SHALL identify every missing parameter.

#### Scenario: Required is omitted

- **WHEN** a workflow parameter does not declare `required: true`
- **THEN** the parameter SHALL retain optional behavior.
