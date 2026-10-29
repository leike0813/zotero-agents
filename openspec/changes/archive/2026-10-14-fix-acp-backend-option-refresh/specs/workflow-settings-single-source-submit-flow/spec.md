## ADDED Requirements

### Requirement: Complete form drafts SHALL remain authoritative

Both workflow option surfaces SHALL distinguish complete form drafts from partial patches. Removed backend-scoped fields SHALL remain removed through refresh, persistence and submission. Backend switching SHALL retain workflow-scoped settings. Observed backend current values SHALL be display-only until explicitly chosen.

#### Scenario: Switch from OpenCode to another backend

- **WHEN** a user switches from a backend with mode `build` to one with current mode `default`
- **THEN** the new backend catalog and current display SHALL replace the old ones
- **AND** the old mode, model provider, model and reasoning SHALL not be submitted or restored from saved settings.

### Requirement: Selected catalog preparation SHALL be isolated to its form

Both workflow option surfaces SHALL automatically prepare unknown selected ACP model/mode reasoning catalogs without prompting. Preparation SHALL have a 60-second total budget, one active probe per form, cancellation on replacement or close, and stale response isolation. Pending or failed preparation and invalid explicit choices SHALL prevent confirmation while retaining editable input.

#### Scenario: Change model while a probe is pending

- **WHEN** the user selects another model or backend before preparation completes
- **THEN** the previous preparation SHALL be canceled
- **AND** its response SHALL not alter the current draft or catalog display.

#### Scenario: Confirm before the catalog echo

- **WHEN** the user confirms during catalog preparation
- **THEN** the form SHALL remain open without submitting old options
- **AND** unrelated typed fields SHALL remain intact.
