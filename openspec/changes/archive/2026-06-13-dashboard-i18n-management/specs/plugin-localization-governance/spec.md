## ADDED Requirements

### Requirement: Dashboard-family localization SHALL be governed

Dashboard-family fixed UI copy SHALL be governed through Fluent-backed snapshot labels across the supported locale set.

#### Scenario: Dashboard direct UI fallback is introduced

- **WHEN** a Dashboard-family static renderer introduces direct user-visible English fallback in common UI call sites
- **THEN** localization governance MUST fail
- **AND** the fixed copy MUST move behind snapshot labels or an existing localized helper

#### Scenario: Dashboard locale key is missing in a supported locale

- **WHEN** a Dashboard, ACP, run dialog, workflow settings, or Assistant panel Fluent key is added
- **THEN** all supported addon locales MUST define the same key set

### Requirement: Dashboard localization SHALL preserve raw runtime content

Dashboard localization SHALL localize fixed UI chrome and controlled labels only.

#### Scenario: Runtime/user content is displayed

- **WHEN** Dashboard renders workflow labels, backend display names, task messages, runtime logs, ACP transcript content, tool output, generated reports, or free-form errors
- **THEN** the UI MUST preserve the original text
- **AND** it MUST NOT auto-translate that runtime content
