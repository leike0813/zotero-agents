## MODIFIED Requirements

### Requirement: ACP Chat live sessions SHALL be capped

ACP Chat SHALL limit live ACP adapters/remote connections to three sessions.
The cap SHALL apply only to live adapters, not to saved local conversation
history. Plugin shutdown SHALL release all live adapters best-effort and persist
local idle metadata even when an adapter close promise does not settle.

#### Scenario: fourth live chat evicts least recently active idle session

- **GIVEN** three ACP Chat sessions have live adapters
- **AND** at least one live adapter is idle
- **WHEN** the user opens a fourth live ACP Chat session
- **THEN** the oldest idle live adapter SHALL be closed
- **AND** its local conversation SHALL remain saved.

#### Scenario: busy sessions are not evicted

- **GIVEN** three ACP Chat sessions have live adapters
- **AND** all three are prompting or waiting on a permission decision
- **WHEN** the user opens another ACP Chat session
- **THEN** the new connection SHALL fail with a structured limit error
- **AND** existing live sessions SHALL remain connected.

#### Scenario: plugin shutdown releases live chat adapters with timeout

- **GIVEN** an ACP Chat session has a live adapter
- **WHEN** plugin shutdown runs and the adapter close promise does not settle
- **THEN** shutdown SHALL continue after the bounded timeout
- **AND** the conversation state SHALL be persisted as `idle`
- **AND** the local session slot, listeners, timers, and adapter reference SHALL
  be released.
