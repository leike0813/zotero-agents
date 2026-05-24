## ADDED Requirements

### Requirement: Taxonomy contains integrated route synthesis

The structured topic artifact SHALL include `taxonomy.summary` as a first-class
integrated analysis of all taxonomy nodes.

#### Scenario: Taxonomy summary is missing

- **WHEN** a complete topic synthesis artifact omits `taxonomy.summary`
- **THEN** validation fails before apply.

### Requirement: Timeline contains integrated historical synthesis

The structured topic artifact SHALL represent `timeline_events` as an object
with `summary` and `events`.

#### Scenario: Timeline is authored as a bare array

- **WHEN** a new complete topic synthesis artifact uses a bare array for
  `timeline_events`
- **THEN** validation fails before apply.

### Requirement: Report records section-source chapters

The synthesis report SHALL record that its route and historical-progression
chapters derive from `taxonomy.summary` and `timeline_events.summary`.

#### Scenario: Report omits source chapter binding

- **WHEN** a complete topic synthesis artifact contains `synthesis_report`
  without `source_section_chapters`
- **THEN** validation fails before apply
- **AND** the error identifies the missing report source binding.

### Requirement: Skill output uses structured-only run artifacts

Topic synthesis skills SHALL leave Markdown compatibility export rendering to
the host.

#### Scenario: A create or full update run returns markdown preview paths

- **WHEN** a complete topic synthesis final bundle or section manifest includes
  `markdown_path`, `preview.md`, or `export.md` as run-workspace outputs
- **THEN** validation fails before host persistence
- **AND** host apply renders canonical `current/export.md` only after the
  structured artifact has been materialized.
