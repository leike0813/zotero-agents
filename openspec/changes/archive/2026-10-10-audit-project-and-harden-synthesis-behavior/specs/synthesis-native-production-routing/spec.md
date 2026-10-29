## ADDED Requirements

### Requirement: RPC envelope failures SHALL remain distinct from native and transport failures

The client SHALL validate a decoded RPC envelope before interpreting its outcome. Non-object envelopes, invalid outcome discriminators, missing branch payloads and contradictory HTTP success SHALL produce the configured invalid-response error. Valid native failures SHALL preserve their existing error mapping and details; transport cancellation, timeout and unavailability SHALL retain their distinct categories.

#### Scenario: A decoded response is not a result envelope

- **WHEN** the response is JSON null, an array, a primitive, an object without a boolean outcome, or a failure without an error code
- **THEN** the caller receives the invalid-response category
- **AND** no result projection is invoked

#### Scenario: HTTP and success payload disagree

- **WHEN** an unsuccessful HTTP response claims a successful RPC result, or a successful envelope lacks its data member
- **THEN** the caller receives the invalid-response category

#### Scenario: Native failure is well formed

- **WHEN** a valid failure envelope includes a native error code and optional details, including the current unknown request and instance identities
- **THEN** the existing native error mapping and bounded diagnostics are preserved
- **AND** the response is not reclassified as a transport outage

#### Scenario: Response belongs to a different successful call

- **WHEN** a successful envelope has a different request or service instance identity
- **THEN** the caller receives runtime_mismatch before result projection
