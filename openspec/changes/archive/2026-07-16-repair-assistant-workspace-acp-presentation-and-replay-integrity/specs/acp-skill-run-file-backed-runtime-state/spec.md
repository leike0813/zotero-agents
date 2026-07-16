## MODIFIED Requirements

### Requirement: Skills Workspace reads a minimal owner model

ACP Skills Workspace SHALL read one minimal owner DTO per publication batch and
SHALL NOT clone complete run events or construct a panel snapshot before
selecting regions. Diagnostics SHALL use a separate DTO.

#### Scenario: Copy diagnostics is requested

- **WHEN** the user copies run diagnostics
- **THEN** the store returns the diagnostics DTO
- **AND** no transcript page or panel presentation is constructed.

### Requirement: Skills presentation preserves owner semantics

Skills title SHALL prefer task name, workflow label, then skill id. Subtitle and
sequence semantics, owner status fields, banner metadata/usage/recovery/workspace
details, and diagnostics SHALL remain visible through owner presentation.

#### Scenario: A sequence task is selected

- **WHEN** the selected run has sequence and workflow metadata
- **THEN** its title/subtitle retain step and workflow meaning
- **AND** switching tasks preserves unrelated keyed task-card DOM identity.
