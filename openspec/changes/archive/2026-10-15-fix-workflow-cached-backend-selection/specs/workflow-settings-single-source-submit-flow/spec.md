# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Selected catalog preparation SHALL be isolated to its form`
- TO: `### Requirement: Manual catalog refresh SHALL be isolated to its form`

## MODIFIED Requirements

### Requirement: Ordinary ACP form projection SHALL preserve explicit and unset selections

Opening or refreshing a workflow form SHALL preserve unset ACP overrides and unavailable explicit values. Unset model/mode controls SHALL display the backend's valid current entry, or the catalog's first entry when current is absent. All defaults SHALL use ordinary catalog options. Provider filtering SHALL use the same UI provider selection shown by the form. Explicit provider changes SHALL select that provider's first cached model. Model/provider/mode changes SHALL retain only reasoning valid for the selected cached context; missing context metadata SHALL disable reasoning and leave it unspecified.

#### Scenario: Refresh with no explicit model

- **WHEN** the form opens or its catalog refreshes with no explicit ACP model or reasoning
- **THEN** those selections SHALL remain unset and SHALL NOT produce runtime overrides.
- **AND** the controls SHALL display ordinary catalog defaults without adding a separate default option or suffix.

#### Scenario: Explicit raw value becomes unavailable

- **WHEN** a catalog refresh removes an explicit ACP model or reasoning value
- **THEN** the form SHALL preserve the value as unavailable
- **AND** execution SHALL fail validation rather than substitute a catalog entry.

### Requirement: Complete form drafts SHALL remain authoritative

Both workflow option surfaces SHALL distinguish complete form drafts from partial patches. Removed backend-scoped fields SHALL remain removed through refresh, persistence and submission. Backend switching SHALL retain workflow-scoped settings. Observed backend current values SHALL be display-only until explicitly chosen.

Each workflow SHALL remember backend-scoped provider, model, mode and valid reasoning choices only within the current form lifetime. Returning to a backend SHALL restore valid remembered choices; invalid remembered values SHALL be discarded and displayed using that backend's default rules. Selections from another backend SHALL never become its defaults.

#### Scenario: Switch from OpenCode to another backend

- **WHEN** a user switches from a backend with mode `build` to one with current mode `default`
- **THEN** the new backend catalog and current display SHALL replace the old ones
- **AND** the old mode, model provider, model and reasoning SHALL not be submitted or restored from saved settings.

### Requirement: Manual catalog refresh SHALL be isolated to its form

Both workflow option surfaces SHALL read the backend's complete cached model catalog, including all model providers. Opening forms and changing backend, provider or model SHALL use cached data without probing. Missing or expired cache SHALL prompt a manual refresh while existing cached choices remain usable. Missing reasoning context SHALL NOT block a submission without explicit reasoning. A user-triggered refresh SHALL have a 60-second total budget, one active probe per form, cancellation on context replacement or close, and stale response isolation. Invalid explicit choices SHALL prevent confirmation while retaining editable input.

#### Scenario: Change model while a probe is pending

- **WHEN** the user selects another model or backend before a manual refresh completes
- **THEN** the previous refresh SHALL be canceled
- **AND** its response SHALL not alter the current draft or catalog display.

#### Scenario: Confirm before the catalog echo

- **WHEN** the user confirms during a manual catalog refresh
- **THEN** the form SHALL remain open without submitting old options
- **AND** unrelated typed fields SHALL remain intact.
