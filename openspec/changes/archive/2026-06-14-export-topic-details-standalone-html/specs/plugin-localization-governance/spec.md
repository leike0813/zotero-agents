## ADDED Requirements

### Requirement: Synthesis standalone export localization governance

Synthesis standalone export UI labels SHALL be included in the existing Synthesis
localization dictionary and four-locale Fluent parity checks.

#### Scenario: Export labels are localized

- **GIVEN** the Topic Details export action, save dialog labels, and standalone fallback messages are rendered
- **WHEN** localization governance runs
- **THEN** each fixed UI label is backed by a Synthesis message key
- **AND** `en-US`, `zh-CN`, `ja-JP`, and `fr-FR` contain the same key set
- **AND** export envelope field names and schema identifiers are not treated as user-visible UI copy
