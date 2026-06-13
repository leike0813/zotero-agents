## ADDED Requirements

### Requirement: Workflow manifests SHALL support display localization metadata

Workflow manifests SHALL allow authors to declare display-only i18n metadata for workflow-owned fixed UI strings.

#### Scenario: Inline workflow messages are accepted

- **WHEN** a workflow manifest declares `i18n.messages` with locale maps for `label`, `taskNameTemplate`, or `parameters.<key>.title`/`description`
- **THEN** schema validation SHALL accept the manifest
- **AND** the raw manifest fields SHALL remain the stable fallback values.

#### Scenario: Invalid inline message shape is rejected

- **WHEN** a workflow manifest declares non-object locale messages or non-string message values
- **THEN** schema validation SHALL reject the manifest with deterministic diagnostics.

### Requirement: Workflow package manifests SHALL support package locale resources

Workflow package manifests SHALL allow authors to declare package-owned locale JSON resources for workflow display strings.

#### Scenario: Package locale resource is accepted

- **WHEN** a workflow package manifest declares `i18n.locales` mapping locale tags to package-relative JSON paths
- **THEN** package schema validation SHALL accept the manifest
- **AND** loader scan SHALL read the locale messages for workflows in that package.

#### Scenario: Missing package locale resource is diagnostic

- **WHEN** a package locale path cannot be read or parsed as a string map
- **THEN** loader scan SHALL emit a deterministic workflow diagnostic
- **AND** workflows in the package SHALL remain loadable using raw manifest fallback strings.
