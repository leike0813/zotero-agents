## MODIFIED Requirements

### Requirement: Paper Registry is SQLite-backed local working state

Paper Registry SHALL use SQLite as its runtime source of truth for registry
rows, facets, works, references, resolutions, cleanup items, and view summaries.

#### Scenario: Registry row is read

- **WHEN** the Workbench, MCP, or Host Bridge reads Paper Registry rows
- **THEN** the rows SHALL be returned from indexed SQLite state
- **AND** the read SHALL NOT scan Zotero library items, child note payloads, or
  JSON canonical files.

#### Scenario: Paper facet changes

- **WHEN** a paper metadata, artifact, reference, readiness, or topic-usage facet
  changes
- **THEN** only the affected SQLite rows and facet hashes SHALL update
- **AND** unrelated paper rows SHALL remain untouched.

### Requirement: Cleanup decisions update reference resolution state

Literature cleanup SHALL represent a concrete reference resolution decision,
not a status-only marker.

#### Scenario: Reference work is confirmed

- **WHEN** the user confirms an unresolved reference as a reference-only work
- **THEN** the cleanup item SHALL close
- **AND** the reference resolution/work rows SHALL update in the same SQLite
  transaction
- **AND** the Index SHALL be able to display the reference-only work without a
  projection rebuild.

#### Scenario: Existing paper is matched

- **WHEN** the user matches a cleanup item to an existing paper
- **THEN** the reference resolution SHALL point to that paper
- **AND** affected citation graph dirty events SHALL be recorded.

#### Scenario: Reference is ignored

- **WHEN** the user ignores a cleanup item
- **THEN** the item SHALL close without promoting a work or matching a paper
- **AND** future Index reads SHALL not show it as open cleanup.
