## ADDED Requirements

### Requirement: Runtime command resolution SHALL cache launch specifications

The platform services SHALL include the platform-specific launch command, arguments, environment additions, and diagnostic command line in each available startup runtime command resolution.

#### Scenario: Windows command shim launch is cached

- **GIVEN** startup command resolution finds `npx` at a Windows `.cmd` or `.bat` path
- **WHEN** the startup command registry is initialized
- **THEN** the cached `npx` resolution SHALL include a PowerShell launch specification
- **AND** the PowerShell script SHALL invoke the resolved shim path explicitly.

#### Scenario: Direct executable launch is cached

- **GIVEN** startup command resolution finds a command at an `.exe` path
- **WHEN** the startup command registry is initialized
- **THEN** the cached resolution SHALL include a direct launch specification for that executable.

#### Scenario: Runtime consumers reuse cached launch specifications

- **GIVEN** the startup command registry has cached a launch specification for a runtime command
- **WHEN** ACP backend launch or runtime dependency probing starts that command
- **THEN** it SHALL use the cached launch specification
- **AND** it SHALL NOT rebuild `.cmd` or `.bat` shell wrapping in the ACP transport layer.
