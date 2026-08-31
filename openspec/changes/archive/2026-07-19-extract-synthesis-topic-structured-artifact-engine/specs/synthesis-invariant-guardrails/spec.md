## ADDED Requirements

### Requirement: Topic Structured Artifact engine SHALL remain environment-neutral

The engine package and its transitive runtime imports SHALL not depend on Node,
Zotero, DOM, plugin toolkit, application persistence, Host ports, or absolute
runtime paths.

#### Scenario: Boundary guard scans the engine
- **WHEN** invariant tests inspect the structured-artifact engine import graph
- **THEN** only environment-neutral engine modules SHALL be reachable.

#### Scenario: Application composes the engine
- **WHEN** production legacy or readonly composition creates a Synthesis service
- **THEN** it SHALL inject the engine through the single application adapter
- **AND** the public service inventory SHALL remain `108 methods / 1 direct consumer`.
