# topic-synthesis-skills Specification

## Purpose
TBD - created by archiving change apply-citation-graph-metrics-to-topic-synthesis-skills. Update Purpose after archive.
## Requirements
### Requirement: Topic synthesis skills consume citation graph metrics as auxiliary context

Create and update topic synthesis workflows SHALL request citation graph metrics
for resolved library papers and use them only as auxiliary synthesis context.

#### Scenario: Workflow declares metrics MCP dependency

- **WHEN** create/update topic synthesis workflow manifests are loaded
- **THEN** their required MCP tools SHALL include `synthesis.get_citation_graph_metrics`.

#### Scenario: Runtime records metrics attempts before artifact export

- **GIVEN** a run has a resolved paper workset
- **WHEN** the gate advances beyond resolver persistence
- **THEN** it SHALL request `persist_citation_graph_metrics` before artifact export
- **AND** artifact export SHALL be blocked until every workset paper has a metrics receipt.

#### Scenario: Missing metrics degrade quality without blocking synthesis

- **WHEN** `synthesis.get_citation_graph_metrics` returns missing, stale, or empty metrics
- **THEN** the runtime SHALL record diagnostics for the requested papers
- **AND** the synthesis flow SHALL continue.

#### Scenario: Metrics do not become direct evidence

- **WHEN** the agent writes claims or timeline events
- **THEN** they SHALL still reference valid digest-backed paper evidence
- **AND** citation graph metrics SHALL NOT be accepted as direct evidence refs.

