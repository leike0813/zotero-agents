## ADDED Requirements

### Requirement: Content transfer failures SHALL preserve their safe cause

Content-transfer RPC failures SHALL retain a bounded stable cause across the transfer adapter, Reverse Host response, and business audit. Known availability failures SHALL use the existing unavailable classification rather than generic internal failure. Exception prose, endpoints, filesystem paths, payload content, and credentials SHALL NOT be included in these diagnostic fields.

#### Scenario: Export transfer cannot connect
- **WHEN** an export content-transfer RPC fails before receiving a response
- **THEN** the caller receives the existing availability failure with `transport_unavailable` as its safe cause
- **AND** the business failure summary retains that cause independently of its public sidecar code

#### Scenario: A transfer returns a safe application cause
- **WHEN** the sidecar returns a recognized transfer failure and a safe structured reason
- **THEN** the transfer adapter and Reverse Host retain its code and reason
- **AND** no adapter substitutes raw exception text or automatically replays the export
