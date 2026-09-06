## MODIFIED Requirements

### Requirement: Submit preview SHALL show declaratively legal execution units

The submit gate MUST evaluate availability-phase declarative selection
validation against one immutable ordered canonical selection acquired completely when
the user triggers the workflow. When more than one availability-valid
execution unit exists, the dialog MUST show an ordered, compact,
one-row-per-unit preview using truncated `taskName` display. The preview
MUST remain fixed for that dialog instance and MUST NOT execute provider
preflight, request building, provider execution, or apply hooks.

#### Scenario: Multiple legal units are selected

- **WHEN** declarative validation resolves two or more legal execution units
- **THEN** the left side of the submit dialog SHALL list all legal units in execution order
- **AND** each row SHALL use compact truncated task-name presentation without execution details

#### Scenario: Selection changes while the dialog is open

- **GIVEN** the user triggered a workflow with selection context A
- **WHEN** the Zotero selection changes to context B before the user confirms submission
- **THEN** the dialog SHALL retain the preview derived from context A
- **AND** confirmed preparation SHALL plan against context A rather than reading context B

#### Scenario: Non-configurable workflow prepares asynchronously

- **WHEN** a non-configurable workflow is triggered and the Zotero selection changes while preparation is pending
- **THEN** preparation SHALL continue using the trigger-time selection context
- **AND** it SHALL NOT re-read the live selection to construct submitted units

#### Scenario: Confirmed settings change execute-mode planning

- **GIVEN** the trigger-time selection context is fixed
- **WHEN** the user changes workflow parameters or provider options before confirmation
- **THEN** confirmed execute-mode planning MAY filter or expand units according to those settings
- **AND** every confirmed plan SHALL still use the fixed trigger-time selection context as its input

#### Scenario: Selection snapshot construction fails

- **WHEN** the trigger-time selection context cannot be constructed
- **THEN** the workflow SHALL halt through the existing workflow failure path
- **AND** confirmation-time live selection SHALL NOT be used as a fallback

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

#### Scenario: Selection changes between pages
- **WHEN** trigger acquisition receives basis_mismatch on a continuation
- **THEN** it discards every acquired page and halts without automatically retrying or opening a submission with partial input
