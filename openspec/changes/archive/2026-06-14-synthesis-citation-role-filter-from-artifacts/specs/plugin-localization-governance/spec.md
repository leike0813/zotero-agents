## ADDED Requirements

### Requirement: Citation role labels are localized

Synthesis Workbench localization SHALL include labels for citation-role filter
chrome and known literature-analysis function values.

#### Scenario: Known roles render through locale messages

- **GIVEN** graph edge roles include known literature-analysis function values
- **WHEN** the Synthesis graph controls or inspector render them
- **THEN** the labels SHALL come from the Synthesis i18n dictionary
- **AND** the four active addon locales SHALL contain the same keys.
