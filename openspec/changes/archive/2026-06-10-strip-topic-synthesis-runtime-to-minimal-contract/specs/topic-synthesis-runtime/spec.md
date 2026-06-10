## REMOVED Requirements

### Requirement: Runtime integrity is audited before progression

The runtime SHALL detect impossible stage state and hash/receipt inconsistencies
before returning a later gate action or finalizing artifacts.

#### Scenario: Later stages are completed while an earlier stage is still running

- **WHEN** the gate audits runtime state
- **THEN** it returns an integrity blocker instead of allowing later work.

## ADDED Requirements

### Requirement: Split runtime uses a minimal stage contract

The split topic synthesis runtime SHALL expose only the state needed to execute
the staged business flow.

#### Scenario: Runtime progresses through valid stages

- **WHEN** a split topic synthesis stage is run or submitted
- **THEN** the runtime SHALL verify the stage is allowed
- **AND** payload stages SHALL validate the submitted payload against the stage schema
- **AND** command stages SHALL generate the runtime-owned files for that stage.

#### Scenario: Audit action is unavailable

- **WHEN** `scripts/gate.py --action audit` is invoked
- **THEN** the command SHALL fail as an unsupported action.

#### Scenario: Runtime avoids long-lived audit artifacts

- **WHEN** a split topic synthesis run completes
- **THEN** the run workspace SHALL NOT contain `runtime/gate-transcript/`
- **AND** it SHALL NOT contain `runtime/action-transcript/`
- **AND** it SHALL NOT contain `runtime/stage-receipts/`
- **AND** it SHALL NOT contain `runtime/artifact-registry.json`.

### Requirement: Runtime-owned outputs are materialized by runtime actions

The split topic synthesis runtime SHALL own handoffs, views, sidecars, sections,
manifests, and final candidates.

#### Scenario: Agent prewrites final output

- **WHEN** an agent-authored or stale `result/final-output.candidate.json`
  already exists before finalize submit
- **THEN** finalize submit SHALL overwrite it with the runtime-generated final
  candidate.

#### Scenario: Final candidate is produced

- **WHEN** finalize completes successfully
- **THEN** `result/final-output.candidate.json` SHALL contain
  `kind: "topic_synthesis"` and the workflow operation
- **AND** the final result SHALL not be a handoff envelope.
