## ADDED Requirements

### Requirement: Sequence workflow completion MUST be root-owned

Workflow terminal observation, result application, and finish-summary settlement for `skillrunner.sequence.v1` SHALL be owned by the sequence root for both ACP and SkillRunner backends. A concrete step lifecycle record MUST NOT independently terminalize its parent workflow.

#### Scenario: Non-final step does not settle the workflow

- **WHEN** a non-final sequence step reaches execution success and its step-level apply state is terminal
- **THEN** the parent workflow SHALL remain non-terminal while the sequence root is running
- **AND** the workflow SHALL NOT invoke outer result application or emit its finish summary

#### Scenario: Completed root applies and summarizes once

- **WHEN** the sequence root reaches `completed` with a final applicable result
- **THEN** the workflow SHALL invoke outer result application exactly once
- **AND** it SHALL emit exactly one finish summary after application settles

#### Scenario: Output repair does not change completion ownership

- **WHEN** an ACP sequence final step reaches valid final output after zero or more output-repair rounds
- **THEN** workflow completion SHALL follow the same root-owned application and summary rules
- **AND** repair metadata SHALL NOT act as a terminal boundary

#### Scenario: Failed or canceled root prevents application

- **WHEN** the sequence root reaches `failed` or `canceled`
- **THEN** the workflow SHALL settle with the matching terminal class
- **AND** it SHALL NOT invoke outer result application

#### Scenario: Short-circuited root uses its actual terminal step

- **WHEN** a sequence short-circuits and the root records `completed` before the declared final step runs
- **THEN** workflow settlement SHALL use the last step that actually executed
- **AND** it SHALL still apply and summarize at most once
