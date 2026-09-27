## ADDED Requirements

### Requirement: Availability failures SHALL retain a safe structured reason

Failed host-RPC and pre-dispatch client-operation trace events SHALL retain an
optional bounded stable reason independently of their public error code. The
reason SHALL distinguish service readiness, transport availability, and safe
sidecar-provided causes without including exception prose, paths, payloads, or
credentials. This additive field SHALL remain compatible with
`synthesis-sidecar-observation.v2`.

#### Scenario: Client has no ready connection

- **WHEN** a client operation fails before RPC dispatch because the service is not ready
- **THEN** its terminal trace records public code `unavailable`
- **AND** its structured reason identifies `service_not_ready`
- **AND** no host-RPC span is emitted

#### Scenario: Host transport cannot reach the sidecar

- **WHEN** an RPC attempt fails at the transport boundary
- **THEN** the host-RPC terminal trace retains a stable transport-unavailable reason
- **AND** it does not expose the native exception message

#### Scenario: Sidecar returns a safe application reason

- **WHEN** the sidecar returns an error containing a bounded safe reason
- **THEN** the host-RPC terminal trace retains that reason with the public sidecar code
- **AND** diagnostic consumers can distinguish repository and reverse-Host causes from a generic unavailable result

