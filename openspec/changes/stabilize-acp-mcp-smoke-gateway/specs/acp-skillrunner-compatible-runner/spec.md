## ADDED Requirements

### Requirement: ACP skill replies SHALL recover from failed prompt chains

ACP skill run replies SHALL NOT reuse a previously rejected prompt-chain promise
as the starting point for a later user reply.

#### Scenario: Reply after recovered prompt failure starts a new turn

- **GIVEN** an ACP skill run was recovered from an existing session
- **AND** a recovered continuation prompt failed and rejected its prompt chain
- **WHEN** the user sends a later reply to the same run
- **THEN** the runner SHALL start a new ACP prompt turn for that reply
- **AND** it SHALL NOT immediately fail by replaying the previous prompt-chain
  rejection.

#### Scenario: Failed turn records diagnostics without poisoning state

- **GIVEN** an ACP skill run prompt turn fails
- **WHEN** the runner records the failure
- **THEN** it SHALL retain diagnostics for the failed turn
- **AND** it SHALL clear or replace the mutable prompt-chain state before
  accepting another reply.
