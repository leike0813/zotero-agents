# localized-workflow-summary-assertions Specification

## Purpose
TBD - created by archiving change fix-localized-workflow-summary-assertions. Update Purpose after archive.
## Requirements
### Requirement: Workflow summary count assertions SHALL support localized tokens
Workflow summary count assertions SHALL treat localized labels as aliases of canonical count keys so the same assertion intent works across runtimes.

#### Scenario: English summary is asserted with canonical keys
- **WHEN** a workflow test receives summary text containing English count labels (for example `succeeded`, `failed`, `skipped`)
- **THEN** the assertion helper matches expected canonical counts successfully

#### Scenario: Chinese summary is asserted with canonical keys
- **WHEN** a workflow test receives summary text containing Chinese count labels (for example `成功`, `失败`, `跳过`)
- **THEN** the same expected canonical counts are matched successfully

### Requirement: Workflow suites SHALL reuse one shared summary assertion helper
Workflow-domain tests SHALL consume a shared summary assertion helper instead of maintaining duplicated local summary parsers.

#### Scenario: Literature digest suite uses shared helper
- **WHEN** `workflow-literature-digest` validates execution summary counts
- **THEN** it calls the shared helper rather than a suite-local parser

#### Scenario: Other workflow suites align to shared helper
- **WHEN** `workflow-mineru` and `workflow-tag-regulator` validate execution summary counts
- **THEN** they also call the same shared helper and do not keep duplicated local implementations

### Requirement: Assertion failures SHALL expose actionable diagnostics
When expected counts cannot be matched, failure output SHALL include enough context to diagnose locale and formatting differences quickly.

#### Scenario: Missing expected count
- **WHEN** summary text does not contain a required canonical count (directly or via localized alias)
- **THEN** the assertion fails with a message that includes the expected key/value and raw summary text
