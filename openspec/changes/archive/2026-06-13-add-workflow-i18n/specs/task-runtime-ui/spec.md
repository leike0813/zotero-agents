## ADDED Requirements

### Requirement: Dashboard workflow display SHALL use localized workflow labels

Dashboard workflow cards and newly-created user-visible run labels SHALL use localized workflow labels when available.

#### Scenario: Dashboard workflow card is localized

- **WHEN** dashboard workflow summaries are built for a locale with workflow package messages
- **THEN** each workflow card label SHALL use the localized workflow label
- **AND** workflow ids and settings routing SHALL remain unchanged.

#### Scenario: Existing history is not migrated

- **WHEN** historical task rows already contain workflow labels
- **THEN** the system SHALL NOT rewrite those rows during workflow locale changes
- **AND** only newly-created labels use the current locale projection.
