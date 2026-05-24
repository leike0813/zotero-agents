## ADDED Requirements

### Requirement: Topic synthesis final products remain structured-only

The topic synthesis skill runtime SHALL not emit run-workspace markdown exports.

#### Scenario: Final validation creates only structured run artifacts

- **WHEN** final validation succeeds
- **THEN** create/update full writes `result/topic-analysis.json` and
  `result/result.json`
- **AND** update patch writes `result/topic-analysis.patch.json` and
  `result/result.json`
- **AND** no `preview.md`, `export.md`, or `markdown_path` is part of the skill
  output contract.
