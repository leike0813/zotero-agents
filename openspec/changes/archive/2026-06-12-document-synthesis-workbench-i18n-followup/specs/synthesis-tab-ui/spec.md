## ADDED Requirements

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

### Requirement: Synthesis Workbench MUST preserve protocol values while localizing controlled enum labels

Controlled enum labels SHALL display localized text while preserving their original protocol values.

#### Scenario: Controlled enum is known

- **WHEN** a controlled enum value such as `canonical_merge`,
  `reference_matching`, `not_in_graph`, `library_paper`, `external_reference`,
  `low_signal`, `stale_target`, or `manual_target` is displayed
- **THEN** the UI SHALL show the localized label for that domain/value
- **AND** the underlying DTO, action payload, command name, and operation key
  SHALL keep the original value.

#### Scenario: Controlled enum is unknown

- **WHEN** Workbench receives an unknown controlled enum value
- **THEN** it SHALL render a humanized fallback label without throwing
- **AND** it SHALL preserve the original value for protocol/debug purposes.

### Requirement: Synthesis Workbench SHALL keep user and generated content raw

Synthesis localization SHALL NOT translate or rewrite user-provided or
generated research content.

#### Scenario: Research content is rendered

- **WHEN** Workbench renders topic text, literature titles, topic detail prose,
  report markdown, digest markdown, artifact payloads, or diagnostic free text
- **THEN** that content SHALL be rendered in its source language
- **AND** localization helpers SHALL only translate surrounding fixed UI labels
  and fixed prefixes/suffixes.
