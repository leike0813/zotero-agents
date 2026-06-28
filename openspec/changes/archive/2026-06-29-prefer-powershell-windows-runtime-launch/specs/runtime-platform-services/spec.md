## ADDED Requirements

### Requirement: Runtime command resolution SHALL cache launch specifications

The platform services SHALL include the platform-specific launch command, arguments, environment additions, and diagnostic command line in each available startup runtime command resolution.

#### Scenario: Windows command candidates use suffix priority

- **GIVEN** startup command resolution checks Windows candidates for `npx`
- **WHEN** the startup command registry is initialized
- **THEN** it SHALL consider `.exe`, `.ps1`, `.cmd`, and `.bat` candidates
- **AND** it SHALL prefer them in that order.

#### Scenario: Windows shim is promoted to a verified executable

- **GIVEN** startup command resolution finds a Windows `.ps1`, `.cmd`, or `.bat` shim
- **AND** an argument-preserving `.exe` target can be inferred from the shim or sibling path
- **AND** that `.exe` target exists
- **WHEN** the startup command registry is initialized
- **THEN** the cached command resolution SHALL use the `.exe` target
- **AND** the launch specification SHALL use direct execution.

#### Scenario: Windows shim remains wrapped when executable promotion is unsafe

- **GIVEN** startup command resolution finds a Windows `.ps1`, `.cmd`, or `.bat` shim
- **AND** no argument-preserving `.exe` target can be verified
- **WHEN** the startup command registry is initialized
- **THEN** the cached command resolution SHALL keep the shim path
- **AND** the launch specification SHALL use the suffix-appropriate wrapper.

#### Scenario: Direct executable launch is cached

- **GIVEN** startup command resolution finds a command at an `.exe` path
- **WHEN** the startup command registry is initialized
- **THEN** the cached resolution SHALL include a direct launch specification for that executable.

#### Scenario: Runtime consumers reuse cached launch specifications

- **GIVEN** the startup command registry has cached a launch specification for a runtime command
- **WHEN** ACP backend launch or runtime dependency probing starts that command
- **THEN** it SHALL use the cached launch specification
- **AND** it SHALL NOT rebuild Windows shim interpretation in the ACP transport layer.
