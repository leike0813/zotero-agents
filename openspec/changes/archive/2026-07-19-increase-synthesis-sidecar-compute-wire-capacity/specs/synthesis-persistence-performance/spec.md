## ADDED Requirements

### Requirement: Maximum compute envelopes retain bounded transient work
The sidecar SHALL combine the 8 MiB envelope with fixed JSON structure limits,
one worker, two queued requests, and existing V8 resource limits.

#### Scenario: Maximum-size compute traffic is active
- **WHEN** a compute request approaches the byte and structure limits
- **THEN** health, handshake, and authenticated shutdown remain responsive without unbounded buffering or queue growth

### Requirement: Overflow terminates collection promptly
The HTTP reader SHALL stop retaining additional body chunks after an abort or
byte-limit violation.

#### Scenario: Upload continues after crossing the limit
- **WHEN** the service has detected that an incoming body is oversized
- **THEN** it releases collected chunks and does not wait for the complete upload before resolving the request
