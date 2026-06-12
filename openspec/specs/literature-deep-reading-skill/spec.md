# literature-deep-reading-skill Specification

## Purpose
TBD - created by archiving change bootstrap-literature-deep-reading-skill-runtime. Update Purpose after archive.

## Requirements

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

### Requirement: Stage 10 SHALL accept a flat context request payload

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/context-request.json` as the Stage 10 agent-authored payload after bootstrap.

#### Scenario: Valid context request is submitted

- **GIVEN** `stage_00_bootstrap` has generated source structure and reading views
- **AND** the agent writes a valid `context-request.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-context-request --payload runtime/payloads/context-request.json`
- **THEN** the runtime SHALL validate the payload
- **AND** it SHALL record the submission in runtime state
- **AND** it SHALL not require the agent to provide schema version, stage id, timestamp, status, target paper ref, or raw Host Bridge commands.

### Requirement: Stage 10 SHALL collect Host context as a runtime cascade

The runtime SHALL perform deterministic Host Bridge collection after a valid Stage 10 payload is submitted.

#### Scenario: Host Bridge returns citation graph, layout, concepts, and reference artifacts

- **GIVEN** Host Bridge CLI is available in the run workspace
- **AND** the context request asks for citation graph, concepts, and library reference digests
- **WHEN** Stage 10 is submitted
- **THEN** the runtime SHALL call semantic Host Bridge CLI commands
- **AND** it SHALL write `runtime/views/host-context-view.json`
- **AND** it SHALL write `runtime/views/reference-bindings-view.json`
- **AND** it SHALL write `runtime/views/reference-digests-view.json`
- **AND** it SHALL write `runtime/views/citation-graph-snapshot.json`
- **AND** it SHALL write `runtime/views/citation-graph-layout.json`
- **AND** it SHALL write `runtime/views/concept-candidates-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-host-context.json`.

### Requirement: Citation graph layout SHALL come from Host Bridge layout state

The runtime SHALL use `citation-graph get-layout` for graph coordinates and SHALL NOT compute replacement force layout coordinates.

#### Scenario: Layout is ready

- **GIVEN** `citation-graph get-slice` returns a graph snapshot
- **AND** `citation-graph get-layout` returns ready persisted force-layout coordinates
- **WHEN** Stage 10 is submitted
- **THEN** `citation-graph-snapshot.json` SHALL retain the topology result
- **AND** `citation-graph-layout.json` SHALL retain the raw layout result
- **AND** its normalized nodes SHALL include coordinates keyed by node id.

#### Scenario: Layout is missing or stale

- **GIVEN** `citation-graph get-layout` returns `missing`, `stale`, `too_large`, or `invalid_request`
- **WHEN** Stage 10 is submitted
- **THEN** the runtime SHALL keep the citation graph snapshot if available
- **AND** it SHALL write layout diagnostics
- **AND** it SHALL NOT generate fallback layout coordinates.

### Requirement: Host context collection SHALL degrade without blocking reading

Host Bridge absence or per-command failures SHALL produce diagnostics and empty or partial Host Context Layer views rather than failing Stage 10.

#### Scenario: Host Bridge CLI is unavailable

- **GIVEN** bootstrap outputs exist
- **AND** no Host Bridge CLI can be resolved
- **WHEN** Stage 10 is submitted with an otherwise valid context request
- **THEN** the command SHALL succeed
- **AND** all Stage 10 view files SHALL exist
- **AND** diagnostics SHALL explain that Host Bridge collection was unavailable
- **AND** the final result SHALL still declare that final HTML is not available.

### Requirement: Reference digests SHALL only be attached to library-bound references

The runtime SHALL only collect digest artifacts for references that resolve to library paper refs.

#### Scenario: Mixed library and external references are collected

- **GIVEN** structured references contain both library-bound and external references
- **AND** the context request asks for reference digests
- **WHEN** Stage 10 is submitted
- **THEN** `reference-digests-view.json` SHALL include digest entries only for library-bound references
- **AND** external or unresolved references SHALL not expose digest availability.
