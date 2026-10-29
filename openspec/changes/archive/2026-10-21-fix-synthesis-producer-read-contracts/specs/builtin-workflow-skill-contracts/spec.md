## ADDED Requirements

### Requirement: Skill runtimes SHALL execute their declared structural contracts
Topic Synthesis and Literature Deep Reading runtimes SHALL validate submitted payloads against the complete declared JSON Schema before coercion or domain processing. Domain-specific reference and stage checks SHALL remain in addition to structural validation.

#### Scenario: A union or scalar is invalid
- **WHEN** submitted data violates a declared union, scalar type, enum, required field or closed-object boundary
- **THEN** runtime validation rejects the payload and identifies the offending location.

### Requirement: Generated builtin Skill delivery SHALL require isolated freshness checks
Plugin builds, content packaging and existing CI gates SHALL reject stale generated builtin Skill packages. Checks SHALL render from current sources into isolated outputs, compare all delivered files and leave source and delivery files unchanged.

#### Scenario: Generated output differs
- **WHEN** a renderer source changes without updating its delivered package
- **THEN** build and content packaging fail before packaging with the differing paths.

#### Scenario: Deep Reading graph assets are checked
- **WHEN** freshness validation renders Deep Reading assets
- **THEN** graph templates and Skill outputs are generated only in temporary locations.
