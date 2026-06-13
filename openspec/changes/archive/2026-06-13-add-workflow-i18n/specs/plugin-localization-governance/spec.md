## ADDED Requirements

### Requirement: Workflow package localization SHALL be separate from plugin Fluent governance

Plugin Fluent files SHALL own plugin UI strings, while workflow packages SHALL own workflow-specific fixed display strings.

#### Scenario: Workflow label is package-owned

- **WHEN** a workflow package adds or changes workflow labels, task-name templates, or workflow parameter titles/descriptions
- **THEN** those strings SHALL be declared in workflow package i18n resources or raw workflow manifests
- **AND** they SHALL NOT be required in plugin `addon.ftl` or `preferences.ftl`.

#### Scenario: Plugin shell copy remains Fluent-owned

- **WHEN** plugin shell UI copy around workflow menus, settings pages, toasts, or dashboard controls changes
- **THEN** those strings SHALL remain governed by the plugin Fluent localization rules.
