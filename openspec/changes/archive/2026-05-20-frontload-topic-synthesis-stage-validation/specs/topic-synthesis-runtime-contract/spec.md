## ADDED Requirements

### Requirement: Topic synthesis validates content at the authoring stage

The topic synthesis runtime SHALL validate each semantic content family at the
stage where that content is first authored.

#### Scenario: Route and timeline content is shallow

- **WHEN** `persist_route_timeline` receives taxonomy or timeline content that
  lacks required semantic depth
- **THEN** the runtime SHALL reject it before registering
  `route_timeline_synthesis_hash`
- **AND** it SHALL NOT advance to Stage 8.

#### Scenario: Core analytical content is shallow

- **WHEN** `persist_core_sections` receives claims, debates, gaps, comparison,
  positioning, or review outline content that lacks required semantic depth
- **THEN** the runtime SHALL reject it before registering
  `core_analytical_sections_hash`
- **AND** it SHALL NOT advance to Stage 9.

### Requirement: Final section assembly is payload-first

Stage 9 SHALL read and validate a run-local payload before writing final
`result/sections/*.json` files.

#### Scenario: Stage 9 payload is invalid

- **WHEN** `persist_external_statistics_report` receives no payload, a payload
  without `sections`, or shallow external/statistics/report content
- **THEN** the runtime SHALL reject the action
- **AND** it SHALL NOT write final section files or advance to Stage 10.

#### Scenario: Stage 9 payload is valid

- **WHEN** the Stage 9 payload and merged section view pass validation
- **THEN** the runtime SHALL materialize `result/sections/*.json`
- **AND** advance to Stage 10.

### Requirement: Final validation remains a complete parity check

`validate_final_artifacts` SHALL continue to validate schema, evidence closure,
digest refs, registry hashes, and final bundle generation even after Stage 9
prevalidation succeeds.

#### Scenario: Final section file is polluted after Stage 9

- **WHEN** a registered final section file is modified before Stage 10
- **THEN** final validation SHALL fail before writing `result/result.json`.
