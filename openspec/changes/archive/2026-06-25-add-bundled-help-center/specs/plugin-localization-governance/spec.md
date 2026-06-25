## ADDED Requirements

### Requirement: Bundled help center shell localization SHALL be governed

Bundled help center shell labels SHALL be localized for every locale included in
the bundled help manifest, even when those labels are loaded before Fluent
resources are available to the chrome page.

#### Scenario: Help center shell label is added

- **WHEN** the bundled help center adds a fixed shell label such as title,
  Online Docs, language selector, loading state, unavailable state, or failure
  state
- **THEN** the help center SHALL provide that label for every bundled help locale
- **AND** the bundled help center packaging tests SHALL cover the localization
  table contract.
