## ADDED Requirements

### Requirement: Literature search ingest SHALL project all search controls to its ACP runner prompt

The bundled `literature-search-ingest` runner prompt SHALL render the request's
`query`, `searchMode`, `searchBreadth`, `languageHints`, and `targetCollection`
values before the agent begins execution. Array-valued `languageHints` SHALL be
rendered as a JSON array so individual hints remain distinguishable.

#### Scenario: User supplies language and breadth controls

- **WHEN** an ACP Skill run starts with `searchBreadth: "balanced"` and
  `languageHints: ["en", "zh-CN"]`
- **THEN** its rendered runner prompt includes the selected breadth and the
  JSON array of language hints

### Requirement: Literature search ingest parameter metadata SHALL be localized completely

Every locale declared by the bundled literature-workbench package SHALL provide
non-empty `title` and `description` values for each
`literature-search-ingest` parameter. The raw English workflow manifest SHALL
remain the fallback for locales not declared by the package.

#### Scenario: Supported locale renders all search controls

- **WHEN** literature-search-ingest is displayed under any declared package
  locale
- **THEN** `query`, `searchMode`, `searchBreadth`, `languageHints`, and
  `targetCollection` each resolve a locale-catalog title and description
