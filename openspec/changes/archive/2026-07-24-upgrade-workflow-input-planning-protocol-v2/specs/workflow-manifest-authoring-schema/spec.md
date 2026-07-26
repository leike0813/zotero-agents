## ADDED Requirements

### Requirement: Workflow manifests SHALL declare schema version 2 input planning
Every workflow manifest SHALL declare `schemaVersion: 2`, an explicit boolean `trigger.requiresSelection`, `inputs.member`, `inputs.grouping`, and a tagged `validateSelection.select` policy.

#### Scenario: Required v2 field is missing
- **WHEN** a workflow omits schema version, trigger selection intent, member kind, grouping mode, or selector policy
- **THEN** the loader rejects the manifest without supplying a default

### Requirement: Legacy input planning declarations SHALL be rejected
The loader SHALL reject `inputs.unit`, `inputs.per_parent`, `validateSelection.select.unit`, `validateSelection.derive`, and legacy selector aliases rather than normalize them.

#### Scenario: Legacy manifest is loaded
- **WHEN** a manifest contains any removed v1 input-planning field
- **THEN** loading fails with a manifest contract error

### Requirement: Count rules SHALL be valid and satisfiable
Count bounds SHALL be non-negative integers; `exact` SHALL be mutually exclusive with `min` and `max`; `min` SHALL NOT exceed `max`; empty rules and selection count combinations with no satisfiable total/mixed solution SHALL be rejected.

#### Scenario: Item bounds cannot satisfy total
- **WHEN** selection item-kind bounds and the declared total bounds have no common solution
- **THEN** the loader rejects the manifest as contradictory

### Requirement: Trigger and selection requirements SHALL not contradict
`requiresSelection: false` SHALL be rejected when positive lower bounds make empty selection impossible, and `requiresSelection: true` SHALL be rejected when selection total is constrained to zero.

#### Scenario: No-selection trigger has positive parent minimum
- **WHEN** a manifest sets `requiresSelection: false` and `selection.parents.min: 1`
- **THEN** the loader rejects the manifest

### Requirement: Selector, member, filter, and grouping declarations SHALL be structurally compatible
The loader SHALL enforce fixed selector output kinds, selection/all grouping constraints, attachment-only MIME acceptance, filter input-kind constraints, and valid availability/execute filter phases.

#### Scenario: MIME acceptance is declared for a note
- **WHEN** `inputs.member.accepts.mime` is present and member kind is not `attachment`
- **THEN** the loader rejects the manifest
