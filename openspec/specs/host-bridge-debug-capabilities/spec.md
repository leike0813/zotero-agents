## Purpose

Host Bridge debug surfaces expose bounded diagnostics for Synthesis cache and explicit operations.

## Requirements

### Requirement: Synthesis debug inspects cache and operations only
Host Bridge debug capabilities SHALL expose bounded sidecar cache diagnostics and explicit operation diagnostics only.

#### Scenario: Debug status is requested
- **WHEN** a debug client requests Synthesis diagnostics
- **THEN** the result SHALL include cache status, recent explicit operations, and bounded repository diagnostics
- **AND** it SHALL NOT expose queue pause, queue resume, worker drain, WorkItem retry, or dirty-event controls.
