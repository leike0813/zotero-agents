## MODIFIED Requirements

### Requirement: Shared ACP child presentation is localized

User-visible fixed text and ARIA labels SHALL resolve through
`AssistantPanelLabels` and the Host label DTO in the shared ACP child, exact
panel projector, both ACP child documents, permission/details metadata,
composer controls, plan, Show more, and task/session drawers, and SHALL exist in
every supported Fluent locale.

#### Scenario: Shared ACP UI adds a fixed label

- **WHEN** a visible label, empty state, status label, drawer field, action, or ARIA description is added
- **THEN** localization governance requires its key in every supported locale
- **AND** the child/model/HTML does not embed the English copy directly.
