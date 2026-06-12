# literature-deep-reading-skill Specification

## ADDED Requirements

### Requirement: Stage 20 SHALL accept a reading enrichment payload

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/reading-enrichment.json` after bootstrap and Host context collection.

#### Scenario: Valid reading enrichment is submitted

- **GIVEN** Stage 00 bootstrap views exist
- **AND** Stage 10 Host Context Layer views exist
- **AND** the agent writes a valid `reading-enrichment.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-reading-enrichment --payload runtime/payloads/reading-enrichment.json`
- **THEN** the runtime SHALL validate the payload
- **AND** it SHALL record the submission in runtime state
- **AND** it SHALL write Analysis Layer views
- **AND** it SHALL return `kind: "literature_deep_reading_enriched"` and `status: "enriched"`
- **AND** it SHALL keep `final_html_available: false`.

### Requirement: Stage 20 SHALL normalize Analysis Layer views

The runtime SHALL normalize enrichment payload and existing runtime views into deterministic Analysis Layer JSON files.

#### Scenario: Analysis views are generated

- **GIVEN** a valid enrichment payload
- **WHEN** Stage 20 is submitted
- **THEN** the runtime SHALL write `runtime/views/preface-view.json`
- **AND** it SHALL write `runtime/views/section-insights-view.json`
- **AND** it SHALL write `runtime/views/concept-overlay-view.json`
- **AND** it SHALL write `runtime/views/references-view.json`
- **AND** it SHALL write `runtime/views/summary-view.json`
- **AND** it SHALL write `runtime/views/extensions-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-enrichment.json`.

### Requirement: Section and reference bindings SHALL be validated

Stage 20 payload references SHALL resolve against existing source sections and reference ids.

#### Scenario: Payload references an unknown source section

- **GIVEN** source structure does not contain `sec-missing`
- **AND** `reading-enrichment.json` contains a section note for `sec-missing`
- **WHEN** Stage 20 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: Payload references an unknown reference id

- **GIVEN** the references seed and bindings do not contain `ref-999`
- **AND** `reading-enrichment.json` contains a reference digest note for `ref-999`
- **WHEN** Stage 20 is submitted
- **THEN** the runtime SHALL reject the payload.

### Requirement: Summary SHALL prefer target digest artifact

The Stage 20 summary view SHALL use the target paper digest artifact when available.

#### Scenario: Target digest exists

- **GIVEN** `runtime/source/artifacts/digest.md` exists
- **AND** the enrichment payload includes fallback summary sections
- **WHEN** Stage 20 is submitted
- **THEN** `summary-view.json` SHALL declare `source: "digest_artifact"`
- **AND** it SHALL derive summary sections from the digest artifact.

#### Scenario: Target digest is missing

- **GIVEN** `runtime/source/artifacts/digest.md` is missing
- **AND** the enrichment payload enables fallback summary sections
- **WHEN** Stage 20 is submitted
- **THEN** `summary-view.json` SHALL declare `source: "agent_fallback"`
- **AND** it SHALL use the fallback summary sections.

### Requirement: Reference digest modal data SHALL require library digest availability

The references view SHALL expose digest modal data only for library-bound references with available digest markdown.

#### Scenario: Mixed reference digest availability

- **GIVEN** one reference is library-bound and has an available digest
- **AND** another reference is external or lacks an available digest
- **WHEN** Stage 20 is submitted
- **THEN** only the library-bound reference with available digest SHALL have `digest_modal.available: true`.

### Requirement: Concept overlay SHALL distinguish resolved concepts from keywords

The concept overlay view SHALL not mark unresolved sidebar keywords as interactive concepts.

#### Scenario: Section note mentions an unresolved concept label

- **GIVEN** Host concept candidates and agent concepts do not contain `Unresolved Term`
- **AND** a section note lists `Unresolved Term`
- **WHEN** Stage 20 is submitted
- **THEN** `concept-overlay-view.json` SHALL retain the label with `status: "keyword_only"`
- **AND** it SHALL not expose a definition for that label.
