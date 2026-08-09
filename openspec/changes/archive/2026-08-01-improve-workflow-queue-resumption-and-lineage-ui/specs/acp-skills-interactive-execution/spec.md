## ADDED Requirements

### Requirement: ACP interactive continuation SHALL regain its submission slot

For a Host-submitted run that yielded, ACP Skills SHALL retain user reply, authorization, and retry intent in memory and request priority resumption before sending the next backend prompt. Cancellation SHALL remain available without a slot and SHALL cancel an unsent continuation.

#### Scenario: Reply waits behind active sibling

- **WHEN** a user replies while another unit holds the submission's only slot
- **THEN** ACP Skills SHALL show the task as resumption-pending
- **AND** SHALL not call the backend until priority admission succeeds

#### Scenario: User cancels before reply admission

- **WHEN** cancellation is confirmed while a reply is resumption-pending
- **THEN** the cached reply callback SHALL not run
- **AND** terminal settlement SHALL not leak or double-release a slot
