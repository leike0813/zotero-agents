## ADDED Requirements

### Requirement: R5 SHALL end with one private complex-kernel implementation
After R5 acceptance, matcher, Topic Structured Artifact, Citation Graph Build, and graph transfer private routes SHALL use Rust exclusively; their Node compute branches SHALL be deleted while plugin TypeScript engines remain until final cutover.

#### Scenario: R5 completion is audited
- **WHEN** local gates and all five native target smokes pass
- **THEN** R5 tasks MAY be declared complete and ready to archive
- **AND** the change SHALL NOT claim R6 layout, R7 durable parity, R8 packaging cutover, or R9 production cutover completion.

### Requirement: R5 native candidates SHALL pass five-target acceptance
Windows x64, macOS x64/arm64, and Linux x64/arm64 candidates SHALL smoke all fourteen operations, carry audited fixed dependencies and provenance, remain below 15 MiB each, and remain below 75 MiB in aggregate.

#### Scenario: Remote matrix completes
- **WHEN** the Rust candidate workflow finishes for the R5 commit
- **THEN** all five target smokes and size gates SHALL succeed before final task completion.
