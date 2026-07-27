## ADDED Requirements

### Requirement: Literature search ingest documentation SHALL list its complete parameter contract

The English and every supported localized site document for
`literature-search-ingest` SHALL describe `query`, `searchMode`,
`searchBreadth`, `languageHints`, and `targetCollection`, including their
defaults and user-visible semantics. Embedded help SHALL be regenerated from
those site sources.

#### Scenario: User reads localized workflow help

- **WHEN** a user opens literature-search-ingest documentation in a supported
  locale
- **THEN** the parameter table includes the configured search breadth and
  optional language hints
- **AND** the corresponding embedded help was generated from the localized site
  source
