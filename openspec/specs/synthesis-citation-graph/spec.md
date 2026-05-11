# synthesis-citation-graph Specification

## Purpose
TBD - created by archiving change add-synthesis-citation-graph. Update Purpose after archive.
## Requirements
### Requirement: Citation graph is deterministic and plugin-owned

Unified Citation Graph SHALL be built by deterministic plugin code and SHALL NOT
depend on LLM inference.

#### Scenario: Graph is built from paper and reference inputs

- **WHEN** library papers and references are provided
- **THEN** the graph SHALL contain library paper nodes, target reference nodes,
  and citation edges directed from citing paper to cited target.

### Requirement: External references use provisional reference keys

External and unresolved reference nodes SHALL use deterministic provisional
reference keys.

#### Scenario: DOI is available

- **WHEN** DOI is available
- **THEN** the provisional key SHALL use normalized DOI before title/year/author.

#### Scenario: Title, year, and first author are available

- **WHEN** DOI, arXiv, and URL are unavailable
- **THEN** title + year + first author SHALL be a deterministic strong key.

### Requirement: External references are promoted when they enter the library

Graph rebuild SHALL promote external/unresolved targets to library paper nodes
when provisional keys match.

#### Scenario: Reference key matches a library paper

- **WHEN** a reference provisional key matches a library paper provisional key
- **THEN** citation edges SHALL target the library paper node
- **AND** the old provisional key SHALL be retained as an alias or promotion
  diagnostic.

### Requirement: Citation edges aggregate repeated source-target references

Repeated source-target citations SHALL be represented as one edge.

#### Scenario: Same paper cites same target repeatedly

- **WHEN** one source paper cites the same target multiple times
- **THEN** the graph SHALL contain one edge
- **AND** `mention_count` SHALL equal the number of mentions.

### Requirement: Citation roles are projected from existing evidence

Citation role labels SHALL come from existing citation analysis evidence only.

#### Scenario: Multiple roles exist for one edge

- **WHEN** role evidence contains multiple labels
- **THEN** one `primary_role` SHALL be selected by evidence count, configured
  priority, then lexicographic label
- **AND** remaining roles SHALL be stored as `aux_roles`.

### Requirement: Layout snapshots are deterministic derived assets

Citation graph layout snapshots SHALL be derived from graph hash and preset.

#### Scenario: Same graph and preset are laid out twice

- **WHEN** layout is computed twice for the same graph and preset
- **THEN** persisted coordinates and layout hash SHALL be identical.

