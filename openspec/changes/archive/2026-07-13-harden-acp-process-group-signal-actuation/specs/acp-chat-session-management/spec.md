## ADDED Requirements

### Requirement: ACP Chat process-tree cleanup SHALL preserve validated signal targets
ACP Chat SHALL delegate local transport teardown to the shared controller whose POSIX signal actuation preserves the complete validated process-group target.

#### Scenario: Wrapper-backed Chat conversation closes
- **WHEN** an ACP Chat conversation using a wrapper-prone local backend does not exit during EOF grace
- **THEN** any TERM or KILL escalation SHALL use the shared controller's validated target
- **AND** an actuation failure SHALL fall back only to the directly held child process
