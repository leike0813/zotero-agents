## ADDED Requirements

### Requirement: Workspace protocol success chatter SHALL bypass persistent logs

Successful tab selection, sidebar close, publication ACK, render observation,
transcript page/details request, handshake retry, publication pulse, snapshot
schedule, and backend refresh scheduling SHALL NOT be appended to the runtime
log, including diagnostic mode. Shell and child ready SHALL remain info lifecycle
events, and failures SHALL remain warn/error events.

#### Scenario: Diagnostic mode processes normal UI traffic
- **WHEN** a tab switch produces publications, acknowledgements, and render observations
- **THEN** exported runtime logs omit those successful stages
- **AND** retain ready lifecycle entries and representative warnings
