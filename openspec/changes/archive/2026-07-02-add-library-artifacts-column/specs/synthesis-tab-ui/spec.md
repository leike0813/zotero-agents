## MODIFIED Requirements

### Requirement: Synthesis Workbench SHALL localize fixed UI through host-provided messages

The Synthesis Workbench page SHALL render user-visible fixed UI text through a
Synthesis i18n message dictionary supplied by the host bridge.

#### Scenario: Host initializes Workbench locale

- **WHEN** the host sends `synthesis:init`, `synthesis:snapshot`,
  `synthesis:chrome`, `synthesis:surface`, or `synthesis:surface-error`
- **THEN** the payload MAY include `i18n.locale` and `i18n.messages`
- **AND** the Workbench SHALL apply those messages before rendering the affected
  chrome or surface
- **AND** the i18n envelope SHALL NOT become part of the business snapshot DTO.

#### Scenario: Fixed UI text is rendered

- **WHEN** Workbench renders navigation, tabs, table headers, buttons, status
  labels, placeholders, titles, aria labels, empty states, or loading/error text
- **THEN** it SHALL resolve the displayed text from the Synthesis i18n
  dictionary or the default English fallback.

#### Scenario: Index artifact availability is rendered

- **WHEN** the Synthesis Index renders digest, references, or citation-analysis
  availability for a registry row
- **THEN** it SHALL use the artifact icon assets instead of D/R/C text badges
- **AND** available or missing state SHALL continue to come from the registry row
  artifact coverage/status data.
- **AND** the icon title and accessible label SHALL identify the artifact and
  its availability.
