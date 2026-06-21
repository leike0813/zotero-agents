## ADDED Requirements

### Requirement: Sequence continuation SHALL use main step status

Sequence workflow runtime SHALL only start a downstream step when the previous step's main status is `succeeded`.

#### Scenario: Step apply failure stops sequence

- **WHEN** a sequence step backend succeeds
- **AND** its required step apply fails with `on_failure: "fail_sequence"`
- **THEN** no downstream step SHALL be submitted
- **AND** the sequence/root main status SHALL be failed.
