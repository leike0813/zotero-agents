## MODIFIED Requirements

### Requirement: ACP skill runner MUST execute ACP skill run requests

ACP skill execution SHALL use `acp.skill.run.v1` as its provider-facing request
contract. The runner MUST reject `skillrunner.job.v1` at its public dispatch
boundary.

#### Scenario: Input manifest uses local paths

- **WHEN** an ACP skill run is created from a workflow with upload-derived input
- **THEN** the run input manifest SHALL contain local absolute file paths
- **AND** it SHALL NOT expose `inputs/<key>/...` upload-relative paths to the
  agent.
