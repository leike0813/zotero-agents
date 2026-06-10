## MODIFIED Requirements

### Requirement: Runtime-owned outputs are materialized by runtime actions

The split topic synthesis runtime SHALL own handoffs, views, sidecars, sections,
manifests, and final candidates.

#### Scenario: Final report section is materialized as structured JSON

- **WHEN** finalize summary is submitted
- **THEN** the runtime SHALL write `result/sections/synthesis_report.json`
- **AND** its `body` field SHALL contain human-readable Markdown report prose
- **AND** the report prose SHALL NOT mention runtime implementation details such
  as Host apply, sidecars, section contracts, artifact contracts, or fallback
  templates.

#### Scenario: Redundant synthesis report preview is not generated

- **WHEN** split finalize completes
- **THEN** the run workspace SHALL NOT contain
  `runtime/views/synthesis-report.md`
- **AND** it SHALL NOT contain `runtime/views/synthesis-report.manifest.json`.
