# literature-deep-reading-skill Specification

## ADDED Requirements

### Requirement: Stage 40 SHALL accept final review and render final HTML

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/final-review.json` after Stage 30 translation and render the final artifact.

#### Scenario: Valid final review is submitted

- **GIVEN** Stage 00, Stage 10, Stage 20, and Stage 30 views exist
- **AND** the agent writes a valid `final-review.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-final-review --payload runtime/payloads/final-review.json`
- **THEN** the runtime SHALL write `result/deep-reading.html`
- **AND** it SHALL write `result/deep-reading-manifest.json`
- **AND** it SHALL write `result/final-output.candidate.json`
- **AND** it SHALL return `kind: "literature_deep_reading_finalized"` and `status: "completed"`
- **AND** it SHALL declare `final_html_available: true`.

### Requirement: Renderer SHALL use the DETR sample template surfaces

The final renderer SHALL preserve the core reader surfaces established by the DETR sample.

#### Scenario: HTML surfaces are rendered

- **GIVEN** all required views exist
- **WHEN** Stage 40 renders HTML
- **THEN** the HTML SHALL include navigation, concept rail, mode switch, preface, paper flow, translation paper, summary, structured references, citation graph, extensions, and digest modal surfaces.

### Requirement: Final HTML SHALL be self-contained

The final HTML SHALL be usable without sidecar assets or network access.

#### Scenario: HTML is inspected statically

- **GIVEN** Stage 40 has rendered `result/deep-reading.html`
- **WHEN** the HTML is scanned
- **THEN** it SHALL NOT reference `http://`, `https://`, `file://`, `assets/`, or `sections/`
- **AND** it SHALL include CSS, JavaScript, data, and images inline.

### Requirement: Citation graph SHALL not compute browser-side layout

The final renderer SHALL use persisted citation graph layout coordinates.

#### Scenario: Layout coordinates are available

- **GIVEN** citation graph snapshot and layout views contain matching nodes
- **WHEN** Stage 40 renders HTML
- **THEN** graph data SHALL include those layout coordinates
- **AND** the HTML SHALL not run force layout.

#### Scenario: Layout coordinates are missing

- **GIVEN** citation graph snapshot exists but layout coordinates are missing
- **WHEN** Stage 40 renders HTML
- **THEN** the citation graph area SHALL render a degraded state
- **AND** the runtime SHALL NOT generate fallback force-layout coordinates.

### Requirement: References after body SHALL remain full width

References and post-reading content SHALL not enter the bilingual body columns.

#### Scenario: References are rendered

- **GIVEN** structured references exist
- **WHEN** Stage 40 renders HTML
- **THEN** references SHALL be represented in the post-reading data
- **AND** references SHALL not be included in translation compare body blocks.
