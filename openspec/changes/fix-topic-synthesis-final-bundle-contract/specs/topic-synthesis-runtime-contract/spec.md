## ADDED Requirements

### Requirement: Topic intent has stable topic definition

Create and update topic synthesis runtimes MUST reject topic intent payloads
that do not contain `topic_definition.id` and `topic_definition.title`.

#### Scenario: legacy intent object

- **WHEN** the payload only contains `intent`
- **THEN** runtime persistence fails before resolver execution

### Requirement: Final bundle references resolver manifest by path

The final result bundle MUST include `resolver_manifest_path` and MUST NOT
embed `topic_resolver`, `resolution_result`, or `resolved_paper_set`.

#### Scenario: final render

- **WHEN** `validate_final_artifacts` writes `result/result.json`
- **THEN** resolver data is referenced by path and diagnostics are lightweight
