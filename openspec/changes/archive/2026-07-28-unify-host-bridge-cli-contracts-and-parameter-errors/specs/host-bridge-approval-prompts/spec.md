## ADDED Requirements

### Requirement: Capability approval SHALL be selected from the executable contract
Host Bridge SHALL validate capability input before selecting the capability's effect and approval policy from the canonical contract. Capability handlers, CLI metadata, and surface renderers SHALL NOT maintain independent approval classifications.

#### Scenario: Invalid write input arrives
- **WHEN** a write capability receives invalid input
- **THEN** Host Bridge SHALL reject the input before creating an approval request
- **AND** no handler or mutation path SHALL execute.

#### Scenario: Valid capability arrives
- **WHEN** a capability receives valid input
- **THEN** the dispatcher SHALL apply the effect and approval policy declared for that capability
- **AND** the handler SHALL not be able to weaken or bypass the selected policy.
