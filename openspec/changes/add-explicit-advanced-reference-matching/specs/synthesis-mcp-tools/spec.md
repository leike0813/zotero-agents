## ADDED Requirements

### Requirement: MCP diagnostics expose advanced matching state without starting work
Synthesis MCP diagnostics SHALL report advanced reference matching operations and proposal counts without running the matcher.

#### Scenario: Proposal diagnostics are requested
- **WHEN** a read-only MCP or Host Bridge debug command lists reference matching status
- **THEN** it SHALL return bounded proposal counts and recent operation diagnostics
- **AND** it SHALL NOT start advanced matching, refresh sidecar data, or rebuild graph cache.

