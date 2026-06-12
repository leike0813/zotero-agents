# literature-deep-reading-skill Specification

## ADDED Requirements

### Requirement: Built-in skill package SHALL expose a single bootstrap runtime CLI

The system SHALL provide a built-in `literature-deep-reading` skill package generated from `skills_src/literature-deep-reading/`.

#### Scenario: Generated package is valid

- **WHEN** the plugin skill registry scans built-in skills
- **THEN** `literature-deep-reading` SHALL be discoverable as a valid built-in skill
- **AND** its directory name, `SKILL.md` frontmatter name, and `assets/runner.json` id SHALL all be `literature-deep-reading`.

#### Scenario: Runtime exposes one agent-facing CLI

- **WHEN** the generated package is inspected
- **THEN** it SHALL include `scripts/deep_reading_runtime.py`
- **AND** it SHALL NOT require a separate `gate.py` or `stage_runtime.py` execution entrypoint.

### Requirement: Bootstrap SHALL materialize deterministic runtime views

The first-phase runtime SHALL accept a source bundle and materialize deterministic bootstrap state without semantic enrichment.

#### Scenario: Markdown source bundle is bootstrapped

- **WHEN** `scripts/deep_reading_runtime.py bootstrap --input runtime/input.json` runs with an input whose `source_bundle_path` points to a bundle containing `source.md`
- **THEN** the runtime SHALL create `runtime/literature-deep-reading.sqlite`
- **AND** it SHALL write `runtime/views/source-structure.json`
- **AND** it SHALL write `runtime/views/reading-blocks.json`
- **AND** it SHALL write `runtime/views/image-manifest.json`
- **AND** it SHALL write `runtime/views/source-reading-view.json`
- **AND** it SHALL write `runtime/views/target-artifacts-view.json`
- **AND** it SHALL write `runtime/views/references-seed-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-bootstrap.json`.

#### Scenario: Bootstrap does not claim final HTML completion

- **WHEN** bootstrap completes
- **THEN** its business result SHALL identify the run as bootstrap-only
- **AND** it SHALL NOT declare `result/deep-reading.html` available.

#### Scenario: Missing optional inputs degrade to diagnostics

- **WHEN** source images or sidecar artifacts are missing
- **THEN** bootstrap SHALL record diagnostics
- **AND** it SHALL continue when `source.md` is available.
