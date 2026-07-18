## ADDED Requirements

### Requirement: Product-owned sidecar launch uses a sealed environment

Runtime platform services SHALL support direct Mozilla Subprocess launch of the
verified Synthesis runtime with an explicit environment and open stdin.

#### Scenario: Sidecar subprocess is launched
- **WHEN** the supervisor starts the verified runtime
- **THEN** `environmentAppend` SHALL be false
- **AND** only documented OS-required variables SHALL be copied
- **AND** stdin, stdout, stderr, wait, and direct kill handles SHALL remain
  available to the supervisor.
