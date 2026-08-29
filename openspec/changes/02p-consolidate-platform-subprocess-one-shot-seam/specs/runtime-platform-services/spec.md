## ADDED Requirements

### Requirement: Platform subprocess SHALL normalize one-shot execution
The platform subprocess interface SHALL resolve the current host subprocess capability, execute one bounded command, and return normalized stdout, stderr, exit status, availability, timeout, and termination evidence across Node and Mozilla adapters. It MUST NOT expose the native process object to callers.

#### Scenario: Command exits normally
- **WHEN** a one-shot command writes stdout and stderr and exits
- **THEN** the caller receives both captured streams and the normalized exit result independent of the selected adapter

#### Scenario: No host adapter is available
- **WHEN** neither a supported Node nor Mozilla subprocess capability is available
- **THEN** the call returns the normalized unavailable outcome without attempting a caller-local fallback

#### Scenario: Command exceeds its bounded timeout
- **WHEN** a one-shot command does not finish before its caller-owned timeout
- **THEN** the platform seam performs bounded termination and returns timeout and termination evidence without claiming a normal exit

### Requirement: Windows one-shot execution SHALL remain hidden
One-shot execution on Windows SHALL avoid opening a visible console window when the selected host adapter supports hidden execution. Adapter selection SHALL use capability shape rather than an operating-system or Zotero-version string alone.

#### Scenario: Windows hidden adapter is available
- **WHEN** a one-shot command is launched in a Windows Zotero runtime with a compatible hidden-execution capability
- **THEN** the platform seam requests hidden execution and returns the same normalized result contract

### Requirement: Domain process lifecycle SHALL remain outside the one-shot seam
Command discovery, login environment parsing, ACP streaming and process-group lifecycle, WebSocket bridge supervision, installer/Git/SkillRunner outcomes, and raw diagnostic enumeration SHALL remain owned by their existing modules. The one-shot seam SHALL accept resolved execution input and return process evidence only.

#### Scenario: ACP transport starts a streaming process
- **WHEN** ACP requires pipe pumping, framing, process identity, or graceful close
- **THEN** ACP retains those behaviors and uses the platform seam only for any genuinely one-shot internal operation
