## MODIFIED Requirements

### Requirement: Runtime foundation SHALL be the native Rust application

The independent packageable sidecar SHALL be the Rust executable and SHALL
implement the strict loopback health, authenticated call, full capability,
isolated repository/canonical, mutation-disabled, bounded transport, and
lifecycle contracts without a Node runtime. Its loopback HTTP boundary SHALL
return health success for a complete explicit GET request, unauthorized for a
complete request carrying an invalid bearer token, and invalid-request for a
malformed payload carrying a valid bearer token.

#### Scenario: Durable smoke sends explicit loopback frames
- **WHEN** a durable candidate is checked before packaging
- **THEN** the smoke SHALL send complete raw TCP HTTP/1.1 frames for health,
  invalid-token, and malformed-payload requests; it SHALL parse the HTTP status
  and response body, and include the body when a status assertion fails
