## MODIFIED Requirements

### Requirement: Runtime foundation SHALL be the native Rust application

The independent packageable sidecar SHALL be the Rust executable and SHALL
implement the strict loopback health, authenticated call, full capability,
isolated repository/canonical, mutation-disabled, bounded transport, and
lifecycle contracts without a Node runtime. Its loopback HTTP boundary SHALL
return health success for a valid explicit GET request, unauthorized for a
complete request carrying an invalid bearer token, and invalid-request for a
malformed payload carrying a valid bearer token.

#### Scenario: Native service becomes ready
- **WHEN** strict config, owner exclusion, repository recovery, canonical recovery, listener, and discovery publication succeed
- **THEN** health and handshake SHALL expose the shared complete capability and O(1) state snapshots

#### Scenario: Explicit durable smoke requests cross the HTTP boundary
- **WHEN** a durable candidate sends explicitly framed health, invalid-token,
  and malformed-payload requests to the loopback listener
- **THEN** the listener SHALL return 200, 401, and 400 respectively
