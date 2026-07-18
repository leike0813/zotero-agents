## ADDED Requirements

### Requirement: Runtime platform services expose normalized architecture

Runtime platform services SHALL resolve the current CPU architecture separately
from the operating-system platform and SHALL expose a stable supported runtime
target.

#### Scenario: Known platform and architecture are detected

- **WHEN** runtime metadata identifies x64 or arm64 on Windows, macOS, or Linux
- **THEN** platform services SHALL return the exact normalized target supported
  by the Synthesis runtime matrix.

#### Scenario: Architecture cannot be proven

- **WHEN** runtime metadata is missing, conflicting, or unsupported
- **THEN** platform services SHALL return an unknown or unsupported target
- **AND** SHALL NOT guess from paths or perform command discovery.

### Requirement: Synthesis runtime assets bypass command resolution

Product-owned Synthesis runtime installation SHALL use packaged asset reads and
verified managed absolute paths only.

#### Scenario: Installer resolves the Node executable

- **WHEN** a supported Synthesis runtime bundle is installed
- **THEN** the resulting Node path SHALL be derived from the verified managed
  installation
- **AND** runtime command registry, PATH search, system Node, npm, npx, and user
  shells SHALL not participate.
