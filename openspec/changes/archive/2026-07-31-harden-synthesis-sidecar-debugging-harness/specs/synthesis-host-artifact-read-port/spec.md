## ADDED Requirements

### Requirement: Reference artifact transport SHALL use a capability-specific bound

General reverse-Host responses SHALL retain the 1 MiB response and two-second
timeout policy. `library.artifacts.read` SHALL use an 8 MiB response-body bound
and ten-second timeout, with the same values enforced by the Host endpoint and
native client.

#### Scenario: Reference artifact exceeds the general bound only
- **WHEN** a valid `library.artifacts.read` response is larger than 1 MiB and no larger than 8 MiB
- **THEN** the reverse-Host transfers and decodes the complete response

#### Scenario: Reference artifact exceeds its capability bound
- **WHEN** the prepared UTF-8 response body is larger than 8 MiB
- **THEN** the Host returns `reverse_host_response_too_large`
- **AND** diagnostics contain the attempted response bytes and selected limit without payload content

### Requirement: Artifact size estimate SHALL cross the descriptor boundary

An available Host artifact descriptor SHALL carry the exact serialized payload
byte estimate calculated at the scan boundary when that estimate is available.
The estimate SHALL be a first-class descriptor field and SHALL NOT be hidden in
free-form diagnostics.

#### Scenario: Available reference artifact is scanned
- **WHEN** the Host constructs its references descriptor
- **THEN** the descriptor carries the payload hash, opaque locator, and exact estimated size used for admission evidence
