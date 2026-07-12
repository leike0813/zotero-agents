## ADDED Requirements

### Requirement: Tag compliance SHALL have one package-owned evaluator
The literature workbench package MUST provide one pure evaluator for comparing item tags against active controlled-vocabulary tags. Tag-auditor and Synthesis Index auditing MUST use that evaluator.

#### Scenario: A tag is outside the active vocabulary
- **WHEN** an item contains a non-empty tag that is not an exact active controlled-vocabulary tag
- **THEN** the evaluator SHALL report that tag as non-compliant
- **AND** the item SHALL be considered to need tag regulation.

#### Scenario: All tags are active vocabulary entries
- **WHEN** every non-empty item tag is an exact active controlled-vocabulary tag
- **THEN** the evaluator SHALL report the item as compliant.

### Requirement: Tag audit state SHALL be local and durable
The Synthesis repository MUST persist a per-library, per-item audit ledger containing compliance state and non-compliant tags. It MUST not add audit-state tags to Zotero items.

#### Scenario: Full audit reconciles a library
- **WHEN** tag-auditor completes for a library
- **THEN** the ledger SHALL reflect every audited current-library item
- **AND** stale records for items no longer in that library SHALL be removed.

#### Scenario: Tag regulation succeeds
- **WHEN** Tag Regulator completes a valid non-skipped result application for an audited item
- **THEN** its ledger entry SHALL no longer require tag regulation
- **AND** the ledger entry SHALL remain present.

### Requirement: Tag-auditor SHALL run locally without a selection
The built-in `tag-auditor` workflow MUST declare `provider: "pass-through"`, `inputs.unit: "workflow"`, and no required selection.

#### Scenario: User starts tag-auditor without selecting items
- **WHEN** the user runs tag-auditor with an empty Zotero selection
- **THEN** it SHALL inspect current-library top-level regular items locally
- **AND** it SHALL not make a backend or network request.
