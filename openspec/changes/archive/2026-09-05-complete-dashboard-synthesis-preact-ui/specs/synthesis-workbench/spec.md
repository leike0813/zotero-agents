## MODIFIED Requirements

### Requirement: Citation graph visual rules SHALL be reusable

The Synthesis Workbench citation graph visual and interaction rules SHALL be reusable by standalone graph exports.

#### Scenario: Shared visual rules are available

- **GIVEN** Workbench citation graph nodes and edges
- **WHEN** graph visual attributes are derived
- **THEN** node size, color, importance halo, edge colors, hover label policy, and selection detail data SHALL be available from shared citation graph renderer logic.

#### Scenario: Readonly standalone mode omits Host actions

- **GIVEN** the graph renderer is running in standalone export mode without a live host bridge
- **WHEN** a library paper node is selected
- **THEN** the renderer SHALL show local selection details
- **AND** it SHALL NOT render Host-only actions such as opening a Zotero item.
