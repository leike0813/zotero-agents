## MODIFIED Requirements

### Requirement: Final HTML renderer

The final renderer SHALL render structured blocks into a self-contained reader without escaping valid paper structures and SHALL render citation graphs through the prebuilt standalone renderer bundle.

#### Scenario: Citation graph uses host layout coordinates

- **GIVEN** citation graph snapshot and layout views are available
- **WHEN** Stage 40 renders the citation graph model
- **THEN** graph nodes SHALL use coordinates from the layout view
- **AND** browser code SHALL NOT compute a replacement force layout.

#### Scenario: Citation graph uses standalone bundle

- **GIVEN** Stage 40 has rendered `result/deep-reading.html`
- **WHEN** the HTML is inspected
- **THEN** it SHALL inline the standalone citation graph renderer bundle
- **AND** it SHALL NOT include the previous SVG-only graph renderer as the primary graph implementation.

#### Scenario: Missing layout degrades without recompute

- **GIVEN** citation graph snapshot exists but layout coordinates are unavailable
- **WHEN** Stage 40 renders the final HTML
- **THEN** the citation graph model SHALL contain no drawable nodes
- **AND** the final HTML SHALL display a graph unavailable state
- **AND** it SHALL NOT compute layout in the browser.

### Requirement: Final HTML SHALL be self-contained

The final HTML SHALL be usable without sidecar assets or network access.

#### Scenario: HTML is inspected statically

- **GIVEN** Stage 40 has rendered `result/deep-reading.html`
- **WHEN** the HTML is scanned
- **THEN** it SHALL NOT reference `http://`, `https://`, `file://`, `assets/`, or `sections/`
- **AND** it SHALL include CSS, JavaScript, data, images, and citation graph renderer assets inline.

## ADDED Requirements

### Requirement: Citation graph model SHALL be render-ready

The runtime SHALL normalize Host citation graph snapshot and layout views into a render-ready model for the standalone renderer.

#### Scenario: Snapshot and layout are merged

- **GIVEN** snapshot nodes and layout nodes share node ids
- **WHEN** Stage 40 builds `sections.json`
- **THEN** `citation_graph.model.nodes[]` SHALL include node identity, title, kind, year, metrics, visibility, display tier, and layout coordinates
- **AND** `citation_graph.model.edges[]` SHALL include only edges whose endpoints are drawable nodes.

### Requirement: Skill runtime SHALL remain Python-only

The `literature-deep-reading` runtime SHALL NOT require Node.js during Stage 40 rendering.

#### Scenario: Final render reads prebuilt assets

- **GIVEN** the built-in skill package contains prebuilt citation graph renderer assets
- **WHEN** Python Stage 40 renders final HTML
- **THEN** it SHALL read those assets from the skill package
- **AND** it SHALL NOT execute a bundler or Node command.
