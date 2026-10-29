# Spec Delta

## ADDED Requirements

### Requirement: Reply submission gives immediate owner-scoped feedback

ACP Chat, ACP Skills and SkillRunner SHALL suppress duplicate reply dispatch
and display local feedback before awaiting host or backend work. The existing
action ID SHALL identify submission independently of the backend lifecycle.

#### Scenario: Reply awaits admission or backend response

- **WHEN** a user submits valid text or selects a typed option
- **THEN** the selected owner's answered controls SHALL disappear immediately
- **AND** its transcript tail SHALL display the text or option label immediately
- **AND** further replies SHALL remain blocked while that submission is pending
- **AND** unrelated managed chrome and existing transcript rows SHALL retain their identity.

#### Scenario: Submission is rejected

- **WHEN** the current submission fails before a usable continuation is accepted
- **THEN** the local user row SHALL remain with an error state
- **AND** the current valid interaction and recoverable text draft SHALL be restored
- **AND** no reply SHALL be retried automatically.

#### Scenario: Canonical reply arrives

- **WHEN** the host associates an accepted submission with a canonical transcript item
- **THEN** the child SHALL merge its local reply by that item identity
- **AND** separate turns with identical text SHALL remain separate messages
- **AND** delayed echoes for previous submissions SHALL merge with their own local messages after a newer submission starts
- **AND** a later agent execution failure SHALL not mark the accepted reply as rejected.

#### Scenario: File or authentication input

- **WHEN** file selection is in progress
- **THEN** the reply controls SHALL show immediate pending feedback and suppress duplicate selection
- **AND** cancellation SHALL restore the current interaction without an invented user message
- **AND** validated file replies SHALL show only a safe filename summary
- **AND** authentication secrets SHALL not be included in local transcript echoes.
