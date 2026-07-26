## ADDED Requirements

### Requirement: Submit confirmation SHALL capture one immutable Host-options snapshot

The submit flow MUST resolve workflow parameters, provider choice, and normalized
Host queue options into one confirmed snapshot. Execution planning and queue
creation MUST consume that snapshot rather than re-reading persisted defaults.

#### Scenario: User overrides the persisted maximum for one multi-unit submit

- **WHEN** a multi-unit dialog opens with persisted maximum concurrency `4` and the user submits with `2`
- **THEN** that submission SHALL capture maximum concurrency `2`
- **AND** changing the persisted default later SHALL NOT alter the active submission

#### Scenario: User submits an empty maximum

- **WHEN** the visible multi-unit maximum-concurrency control is empty at confirmation
- **THEN** the confirmed snapshot SHALL represent unlimited Host concurrency

### Requirement: Maximum concurrency SHALL be an optional workflow-level runtime control

When a submit dialog for ACP Skills or SkillRunner shows more than one legal
execution unit, it MUST expose a maximum-concurrency control below that unit
list. The control MUST accept only non-negative integers, describe `0` and blank
as unlimited, default to the workflow's persisted Host option, and offer the
existing workflow-default persistence interaction. When the unit list is
hidden, the control MUST be hidden as well.

#### Scenario: User enters a fractional or negative value

- **WHEN** the submit dialog contains a negative integer, fraction, or non-numeric value
- **THEN** confirmation SHALL be blocked with field-level validation
- **AND** no queue or backend task SHALL be created

#### Scenario: User persists the submitted value

- **WHEN** the user confirms a valid maximum in a multi-unit dialog and chooses to save workflow defaults
- **THEN** the canonical Host option SHALL be saved through the workflow settings domain
- **AND** the current submission SHALL use the same normalized value

#### Scenario: Unsupported provider is selected

- **WHEN** a workflow submission targets Generic HTTP or pass-through
- **THEN** the native Host maximum-concurrency control SHALL remain hidden
- **AND** that provider's execution SHALL remain unchanged

### Requirement: Submit preview SHALL show declaratively legal execution units

The submit gate MUST evaluate only availability-phase declarative selection
validation against the current selection once while the dialog opens. When more
than one availability-valid execution unit exists, the dialog MUST show an
ordered, compact, one-row-per-unit preview using truncated `taskName` display.
The preview MUST remain fixed for that dialog instance and MUST NOT execute
provider preflight, request building, provider execution, or apply hooks.

#### Scenario: Multiple legal units are selected

- **WHEN** declarative validation resolves two or more legal execution units
- **THEN** the left side of the submit dialog SHALL list all legal units in execution order
- **AND** each row SHALL use compact truncated task-name presentation without execution details

#### Scenario: Invalid selected entries are filtered out

- **WHEN** the current selection contains both declaratively legal and illegal entries
- **THEN** the preview SHALL list only the legal execution units
- **AND** the submit count SHALL match the planned top-level units

#### Scenario: Form values change after preview

- **WHEN** the user edits any field in the open submission dialog
- **THEN** the dialog SHALL retain its original availability preview
- **AND** confirmed execute-mode preparation SHALL remain authoritative for the submitted settings

#### Scenario: Preview encounters execution-time expansion

- **WHEN** provider preflight would later expand a legal source unit
- **THEN** the submit preview SHALL still show the single declarative source unit
- **AND** it SHALL NOT predict or display preflight-derived children

#### Scenario: Full preparation changes the candidate set

- **WHEN** confirmed execute-mode preparation omits or expands one or more previewed candidates
- **THEN** the execution plan SHALL remain authoritative
- **AND** only executable prepared units SHALL enter Host queue admission

#### Scenario: Zero or one legal unit exists

- **WHEN** declarative validation resolves no more than one legal execution unit
- **THEN** the multi-unit list region SHALL remain hidden
- **AND** the maximum-concurrency control SHALL remain hidden
