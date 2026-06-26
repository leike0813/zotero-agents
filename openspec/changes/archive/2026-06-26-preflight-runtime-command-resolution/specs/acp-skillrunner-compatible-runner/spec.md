## MODIFIED Requirements

### Requirement: ACP runner SHALL wrap workflow launches with uv when needed
The ACP runner SHALL use `uv run --with` only for workflow-run ACP launches when
the materialized skill declares runtime Python dependencies and startup command
resolution found uv available. If startup command resolution did not find uv but
did find Python, the runner MAY use the original backend command only after
verifying the declared dependencies are already available in that Python
environment.

#### Scenario: Chat launch is unaffected
- **GIVEN** a skill declares `runtime.dependencies`
- **WHEN** the user starts normal ACP chat
- **THEN** the configured backend command and args SHALL be used unchanged
- **AND** ACP chat SHALL NOT require uv or Python to be available.

#### Scenario: Workflow launch is wrapped through uv
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution found uv available
- **AND** the per-job uv dependency probe succeeds
- **WHEN** the workflow runner launches the ACP process
- **THEN** it SHALL wrap the command with `uv run --with ... --`.

#### Scenario: uv dependency preparation failure does not fall back
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution found uv available
- **AND** the per-job uv dependency probe fails
- **WHEN** the workflow runner resolves runtime dependencies
- **THEN** the run SHALL fail with readiness `uv_dependency_resolution_failed`
- **AND** it SHALL NOT fall back to system Python.

#### Scenario: System Python fallback succeeds
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution did not find uv available
- **AND** startup command resolution found Python available
- **AND** the per-job Python dependency probe verifies the declared dependencies
- **WHEN** the workflow runner launches the ACP process
- **THEN** it SHALL use the configured backend command unchanged.

#### Scenario: System Python fallback misses dependencies
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution did not find uv available
- **AND** startup command resolution found Python available
- **AND** the per-job Python dependency probe cannot verify the declared
  dependencies
- **WHEN** the workflow runner resolves runtime dependencies
- **THEN** the run SHALL fail with readiness
  `system_python_dependencies_missing`.

#### Scenario: No dependency strategy is available
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution found neither uv nor Python available
- **WHEN** the workflow runner resolves runtime dependencies
- **THEN** the run SHALL fail with readiness
  `runtime_dependency_strategy_unavailable`.
