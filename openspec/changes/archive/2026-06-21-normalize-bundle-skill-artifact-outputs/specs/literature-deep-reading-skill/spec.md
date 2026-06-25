## MODIFIED Requirements

### Requirement: Stage 40 SHALL accept final review and render final HTML

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/final-review.json` after Stage 30 translation and render the final artifact.

#### Scenario: Valid final review is submitted

- **GIVEN** Stage 00, Stage 10, Stage 20, and Stage 30 views exist
- **AND** the agent writes a valid `final-review.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-final-review --payload runtime/payloads/final-review.json`
- **THEN** the runtime SHALL write `result/deep-reading.html`
- **AND** it SHALL write `result/deep-reading-manifest.json`
- **AND** it SHALL write a flat `result/deep-reading-artifacts.json` artifact manifest
- **AND** it SHALL write `result/final-output.candidate.json`
- **AND** it SHALL return `kind: "literature_deep_reading_finalized"` and `status: "completed"`
- **AND** the final output SHALL expose `html_path` and `artifact_manifest_path`
- **AND** it SHALL NOT require runtime-internal `db_path` or `views` fields as business output.
