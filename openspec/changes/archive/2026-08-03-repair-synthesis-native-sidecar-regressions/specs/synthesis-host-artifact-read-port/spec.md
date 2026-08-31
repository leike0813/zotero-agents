## MODIFIED Requirements

### Requirement: Reference artifact transport SHALL use a capability-specific bound

General reverse-Host responses SHALL retain the 1 MiB response and two-second timeout policy. `library.artifacts.scan_page` SHALL use the general 1 MiB response-body bound with a ten-second timeout. `library.artifacts.read` SHALL use an 8 MiB response-body bound and ten-second timeout. The Host endpoint and native client MUST enforce the same selected values, and a complete response SHALL be accepted after its declared `Content-Length` arrives without waiting for connection EOF.

#### Scenario: Reference artifact exceeds the general bound only
- **WHEN** a valid `library.artifacts.read` response is larger than 1 MiB and no larger than 8 MiB
- **THEN** the reverse-Host transfers and decodes the complete response

#### Scenario: Reference artifact exceeds its capability bound
- **WHEN** the prepared UTF-8 response body is larger than 8 MiB
- **THEN** the Host returns `reverse_host_response_too_large`
- **AND** diagnostics contain the attempted response bytes and selected limit without payload content

#### Scenario: Artifact scan takes longer than the general deadline
- **WHEN** `library.artifacts.scan_page` completes after two seconds and before ten seconds
- **THEN** the reverse-Host returns the complete bounded scan result

#### Scenario: Complete response keeps the transport open
- **WHEN** all bytes declared by `Content-Length` arrive without connection EOF
- **THEN** the native client decodes the response immediately
- **AND** successful Host release does not truncate buffered tail bytes

#### Scenario: Response ends before its declared length
- **WHEN** reverse-Host EOF occurs before all bytes declared by `Content-Length` arrive
- **THEN** the native client returns `reverse_host_response_body_truncated`
