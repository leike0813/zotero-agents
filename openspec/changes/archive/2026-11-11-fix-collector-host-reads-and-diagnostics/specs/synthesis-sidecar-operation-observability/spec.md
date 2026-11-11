# Spec Delta

## ADDED Requirements

### Requirement: Business failures SHALL retain safe validation diagnostics

The single business failure record SHALL retain the stable client error code alongside its classification and existing sidecar codes. Protocol request and response validation failures SHALL retain a registered schema reference and at most sixteen sanitized keyword/pointer pairs when available. Diagnostic projection MUST NOT expose payload values, credentials, local paths, or user-controlled map keys.

#### Scenario: Host rejects an invalid request before RPC

- **WHEN** Host protocol validation rejects an artifact request
- **THEN** the failure record SHALL retain its client error code, schema reference, and safe validation pointers
- **AND** it SHALL remain the only business failure incident for that invocation.

#### Scenario: Sidecar rejects a request or returns an invalid response

- **WHEN** a sidecar request rejection or response validation failure supplies protocol diagnostics
- **THEN** the failure record SHALL preserve the client and sidecar codes and bounded safe schema diagnostics.

#### Scenario: Error contains private diagnostic material

- **WHEN** error details contain payload values, credentials, local paths, or user-controlled map keys
- **THEN** the business record SHALL omit or redact that material while retaining available safe diagnostic metadata.
