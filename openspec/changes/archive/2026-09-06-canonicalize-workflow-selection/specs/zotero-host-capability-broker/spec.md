## MODIFIED Requirements

### Requirement: Workflow Host API v12 current view SHALL identify selected library-tree sources

The current-view DTO SHALL include ordered JSON-safe source refs for the selected library-tree rows and all distinct selected library ids. It SHALL include the scalar library id only when exactly one library is represented, and the optional normalized current collection only when the entire selection represents one real Zotero collection. Zotero host-version differences SHALL be contained inside the broker. Sources SHALL use libraryIds/selectedSources in the canonical small current-view DTO, Saved Search identity SHALL be a portable libraryId/key ref, and item selection arrays SHALL NOT be embedded.

#### Scenario: One real collection row is selected
- **WHEN** the current Zotero library view contains exactly one selected real collection
- **THEN** `context.getCurrentView()` SHALL include one collection source with its portable ref, name, and library id
- **AND** it SHALL include that collection as the current collection
- **AND** it SHALL report the unique library id

#### Scenario: Multiple rows are selected in Zotero 10
- **WHEN** Zotero reports multiple selected library-tree rows
- **THEN** `context.getCurrentView()` SHALL preserve their host-visible order as portable source refs
- **AND** it SHALL omit the current collection
- **AND** it SHALL omit the scalar library id when more than one library is represented

#### Scenario: Legacy host exposes only one selected row
- **WHEN** Zotero 7 or Zotero 9 provides only the legacy single-row selection shape
- **THEN** the broker SHALL project that row through the same plural DTO
- **AND** downstream Workflow Host, Host Bridge, and MCP projections SHALL NOT branch on the Zotero major version

#### Scenario: Non-collection row is selected
- **WHEN** a selected row represents a library root, saved search, feed, trash, reader, or another non-collection view
- **THEN** the source list SHALL identify its supported portable source kind or a bounded special-view ref
- **AND** the current-view DTO SHALL omit the current collection
- **AND** it SHALL still report unique library identity when available
