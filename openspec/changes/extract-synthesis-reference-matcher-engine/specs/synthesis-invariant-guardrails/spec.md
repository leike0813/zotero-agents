## ADDED Requirements

### Requirement: Matcher engine guardrails SHALL preserve heavy-path isolation

Static and behavioral guards SHALL require Advanced Reference Matching to use the configured engine and SHALL prevent heavy binding or dedupe methods from entering lightweight refresh, workflow apply, graph rebuild, or related-items paths.

#### Scenario: Active sources are inspected

- **WHEN** invariant tests inspect Synthesis application and engine boundaries
- **THEN** only the explicit Advanced Reference Matching path SHALL invoke `matchBindings` or `dedupeCanonicals`
- **AND** the engine package SHALL contain the bounded fuzzy block and pair controls.

### Requirement: Matcher engine SHALL remain dependency neutral

Boundary guards SHALL reject Node, Zotero, plugin, DOM, repository, filesystem, and Host capability imports from the matcher engine.

#### Scenario: Engine imports are scanned

- **WHEN** the matcher engine source is inspected
- **THEN** it SHALL import only environment-neutral engine modules
- **AND** production service inventory SHALL remain `108 methods / 1 direct consumer`.
