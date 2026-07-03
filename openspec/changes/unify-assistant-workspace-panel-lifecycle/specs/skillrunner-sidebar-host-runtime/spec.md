## ADDED Requirements

### Requirement: SkillRunner sidebar SHALL use the unified Assistant child snapshot lifecycle

SkillRunner sidebar UI SHALL initialize and refresh through the Assistant
Workspace shell's child snapshot lifecycle. The shell SHALL NOT create a local
empty SkillRunner init payload and the SkillRunner sidebar host SHALL NOT push
an implicit init snapshot merely because it was attached.

#### Scenario: SkillRunner waits for host snapshot

- **WHEN** the SkillRunner child iframe loads inside Assistant Workspace
- **AND** no SkillRunner host snapshot has been published yet
- **THEN** the shell does not send a shell-synthesized empty
  `skillrunner-sidebar:init`
- **AND** SkillRunner renders after the host publishes its current sidebar
  snapshot.

#### Scenario: SkillRunner ready receives current host snapshot

- **WHEN** the SkillRunner child iframe reports ready
- **AND** the active Assistant Workspace tab is SkillRunner
- **THEN** the Assistant Workspace host binds the SkillRunner sidebar host to
  the current shell window as needed
- **AND** publishes the current SkillRunner sidebar snapshot through the same
  shell child-snapshot path used by ACP Chat and ACP Skills.

#### Scenario: Inactive SkillRunner ready is ignored by the host

- **WHEN** the SkillRunner child iframe reports ready while another Assistant
  Workspace tab is active
- **THEN** the Assistant Workspace host does not bind the SkillRunner sidebar
  host
- **AND** the global SkillRunner run workspace state remains available for
  task execution and explicit run dialogs.

#### Scenario: Sidebar attach does not render by itself

- **WHEN** the Assistant Workspace host attaches the SkillRunner sidebar host
- **THEN** the attach operation only binds bridge state
- **AND** the SkillRunner child receives init or snapshot only from an explicit
  Assistant Workspace state pulse.
