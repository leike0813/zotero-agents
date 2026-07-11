## ADDED Requirements

### Requirement: Silent ACP Skills runs do not observe workspace activity

ACP Skills SHALL NOT perform an initial workspace activity scan, register a workspace-activity refresh timer, or retain a workspace-activity interval while the global execution display mode is silent.

#### Scenario: prompt starts while silent

- **WHEN** an ACP Skills prompt starts in silent mode
- **THEN** no workspace activity scan or timer is created.

#### Scenario: active prompt enters silent

- **WHEN** a workspace activity timer exists and mode changes to silent
- **THEN** the timer is cleared immediately
- **AND** an in-flight scan rechecks mode and discards its result.

#### Scenario: active prompt leaves silent

- **WHEN** mode leaves silent while the same prompt remains active
- **THEN** scoped workspace observation resumes
- **AND** cleanup still removes its timer and preference subscription.
