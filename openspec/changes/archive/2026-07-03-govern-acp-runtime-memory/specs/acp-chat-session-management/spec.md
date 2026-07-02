## MODIFIED Requirements

### Requirement: ACP chat limits live remote sessions

ACP Chat SHALL allow multiple local sessions per backend while limiting the
number of live ACP adapters/remote connections retained by the plugin.

#### Scenario: Fourth live chat evicts idle least-recently-active session

- **GIVEN** three ACP Chat sessions have live adapters
- **AND** at least one live adapter is idle
- **WHEN** another chat session needs a live adapter
- **THEN** the least recently active idle adapter SHALL be disconnected
- **AND** the new chat session MAY create its adapter.

#### Scenario: Busy live chats are protected

- **GIVEN** three ACP Chat sessions have live adapters
- **AND** all three are prompting or waiting on permission
- **WHEN** another chat session needs a live adapter
- **THEN** ACP Chat SHALL reject the new live connection
- **AND** existing busy sessions SHALL remain connected.

#### Scenario: Live chat slot does not own complete transcript text

- **WHEN** an ACP Chat session remains connected across many prompts
- **THEN** the live slot SHALL retain only adapter/session state, active
  transcript item ids, and bounded metadata needed for updates
- **AND** it SHALL NOT retain the complete conversation transcript.
