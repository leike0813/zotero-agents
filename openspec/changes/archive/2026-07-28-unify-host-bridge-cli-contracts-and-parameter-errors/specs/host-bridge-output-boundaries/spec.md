## ADDED Requirements

### Requirement: Executable command contracts SHALL own CLI output boundaries
Every canonical CLI leaf SHALL declare exactly one output boundary and result Schema in the executable command contract, or inherit its untransformed result Schema from its target capability. Separate output-boundary registries SHALL NOT exist.

#### Scenario: Remote response violates the declared result
- **WHEN** a Host response or command transformation violates the applicable result Schema
- **THEN** the CLI SHALL return a protocol failure with exit code 11 for remote data
- **AND** SHALL NOT print a success envelope.

#### Scenario: Local command constructs an invalid result
- **WHEN** a local command produces data that violates its command result Schema
- **THEN** the CLI SHALL return an internal failure with exit code 70.

#### Scenario: Command lacks a boundary
- **WHEN** contract validation finds a missing, duplicate, or incompatible output boundary
- **THEN** command-contract and surface generation SHALL fail.
