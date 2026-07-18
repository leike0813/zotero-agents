## ADDED Requirements

### Requirement: Citation Graph promotes only basis-current worker layouts
The Citation Graph service SHALL treat sidecar layout output as an untrusted pure
compute result and SHALL promote it only after strict rebuilding and a current
graph-basis check.

#### Scenario: Worker result matches the current graph
- **WHEN** a strict worker result returns for the graph hash that remains current
- **THEN** the plugin repository stores the layout using the existing layout schema

#### Scenario: Worker result is invalid or superseded
- **WHEN** the worker result fails strict rebuilding or the graph basis changes
- **THEN** the result is not stored and the previous layout content is retained

