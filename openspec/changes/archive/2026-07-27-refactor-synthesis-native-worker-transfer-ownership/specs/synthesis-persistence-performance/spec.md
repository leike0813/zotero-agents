## ADDED Requirements

### Requirement: Native large transfer SHALL keep control-plane reads responsive

Paged transfer execution SHALL stream from disk with bounded frames and SHALL NOT hold the transfer session owner or repository/canonical owner across worker execution.

#### Scenario: Transfer executes while reads arrive
- **WHEN** a 15 MiB or 75 MiB graph transfer is executing
- **THEN** health and canonical read calls SHALL continue to complete within their existing read deadlines

#### Scenario: Large transfer memory is inspected
- **WHEN** input and output exceed the monolithic compute envelope
- **THEN** the service SHALL retain only descriptors, paths, and at most one unacknowledged frame per direction
- **AND** it SHALL NOT hydrate the full transfer into a service-process JSON value
