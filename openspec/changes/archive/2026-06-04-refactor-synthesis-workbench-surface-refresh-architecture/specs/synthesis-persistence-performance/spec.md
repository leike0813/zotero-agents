## ADDED Requirements

### Requirement: Workbench reads are bounded by surface
Synthesis Workbench read paths SHALL avoid loading unrelated domain data for a surface.

#### Scenario: Graph surface is loaded
- **WHEN** the Graph surface is requested
- **THEN** the service SHALL read graph cache and layout state only
- **AND** it SHALL NOT scan Index rows, Reference Sidecar rows, Tags, or Concepts.

#### Scenario: Review surface is loaded
- **WHEN** the Review surface is requested
- **THEN** the service SHALL read only the active Review tab's bounded review/proposal page and required readable context
- **AND** it SHALL apply status/kind/confidence filters before loading readable context
- **AND** proposal context SHALL be resolved from summary item reads and bounded raw-reference ids
- **AND** it SHALL NOT route through the Index sidecar row builder
- **AND** it SHALL NOT load graph nodes, tag vocabulary, or concept rows.

#### Scenario: Index surface is loaded
- **WHEN** the Index surface is requested
- **THEN** the service SHALL read a bounded Zotero parent-item page
- **AND** it SHALL join sidecar rows only for the current page's source refs
- **AND** default Index library rows SHALL expose reference counts instead of full raw-reference arrays
- **AND** referenced-only mode SHALL use a bounded raw-reference page
- **AND** it SHALL NOT load the Review Center proposal page.

#### Scenario: Zotero item notification invalidates UI cache
- **WHEN** a Zotero item notification reaches the Synthesis Workbench host
- **THEN** the notifier path SHALL only mark affected surface read models dirty and debounce a visible-surface reload
- **AND** it SHALL NOT scan the full Zotero Library
- **AND** it SHALL NOT construct a full Workbench snapshot or invoke Reference Sidecar refresh.

### Requirement: Warmup yields between phases
Synthesis Workbench warmup SHALL yield control between read-model phases.

#### Scenario: Warmup phase completes
- **WHEN** a warmup phase completes or fails
- **THEN** the warmup runner SHALL yield to the event loop before starting the next phase.
