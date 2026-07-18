## MODIFIED Requirements

### Requirement: Workflow descriptions SHALL declare execution ownership modes

Workflow describe and requirements responses SHALL include structured `executionModes` for Host-owned and agent-owned execution, including support, accepted option classes, monitoring, required parameters, and apply-back requirements. Agent-facing guidance SHALL route execution from these fields rather than infer ownership from workflow names or prose.

#### Scenario: Workflow requires options unavailable to agent-run

- **WHEN** a workflow requires parameters that `workflow agent-run` cannot accept
- **THEN** `executionModes.agentOwned.supported` SHALL be false
- **AND** agent-facing semantic surfaces SHALL not recommend agent-owned execution.

#### Scenario: Host-owned execution is supported

- **WHEN** a workflow declares Host-owned support and its required parameters are available
- **THEN** the response SHALL identify the submit command, monitoring handle, and whether any agent apply-back is required.

#### Scenario: Agent-owned execution is supported

- **WHEN** a workflow declares agent-owned support
- **THEN** the response SHALL identify request-bundle parameters, the returned agent-run handle, monitoring behavior, and apply-back requirement.

### Requirement: Agent apply-back SHALL preflight and retain receipts

Host Bridge SHALL validate every supplied result bundle before requesting approval or consuming `agentRunId`. After consumption begins, it SHALL retain a per-request apply receipt that reports applied results, failures, state change, handle consumption, and recoverability. Receipt lookup SHALL remain read-only and safe after terminal or interrupted apply-back.

#### Scenario: One bundle is invalid

- **WHEN** any supplied result bundle fails preflight
- **THEN** no approval SHALL be requested
- **AND** no result SHALL be applied
- **AND** the agent run handle SHALL remain recoverable.

#### Scenario: One result fails after another applies

- **WHEN** apply-back mutates one result and a later result fails
- **THEN** the receipt SHALL identify each applied and failed result
- **AND** it SHALL report state change, handle consumption, and safe recovery without presenting the operation as wholly unapplied.

#### Scenario: Agent inspects an interrupted apply

- **WHEN** the caller queries apply status after interruption
- **THEN** Host Bridge SHALL return the retained receipt without consuming another handle or repeating writes.
