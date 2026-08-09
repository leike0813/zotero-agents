## ADDED Requirements

### Requirement: ACP recovery SHALL participate in Host priority resumption

Recoverable ACP replies, reconnect-driven continuation, and recovered result apply associated with a live Host submission SHALL use that submission unit's priority slot coordinator. Remote autonomous progress MAY begin before local observation, but local continuation and Host apply MUST await admission.

#### Scenario: Recovered run reaches apply while yielded

- **WHEN** a recoverable ACP run produces a final result while its Host unit has no slot
- **THEN** recovered apply SHALL request priority admission
- **AND** SHALL not mutate Zotero before admission succeeds

#### Scenario: Shutdown aborts queued recovery

- **WHEN** plugin shutdown occurs while recovery input is resumption-pending
- **THEN** the unsent input SHALL be discarded
- **AND** later slot activity SHALL not send it
