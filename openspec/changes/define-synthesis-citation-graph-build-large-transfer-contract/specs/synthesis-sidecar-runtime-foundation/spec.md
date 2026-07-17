## ADDED Requirements

### Requirement: Sidecar SHALL expose authenticated graph-build transfer sessions
The sidecar SHALL advertise `compute.citation_graph_build_transfer` through discovery handshake parity and SHALL require the profile client bearer token for every transfer action.

#### Scenario: Capability discovery matches handshake
- **WHEN** the runtime publishes discovery and an authenticated client performs a handshake
- **THEN** both surfaces report the transfer capability exactly once with all existing capabilities

#### Scenario: Transfer authorization fails
- **WHEN** a transfer action omits the client token, uses another token, or names another profile
- **THEN** the service rejects it before reading or mutating transfer session state

### Requirement: Sidecar health SHALL report transfer state in constant time
Health and handshake SHALL include `citationGraphTransfer` with state `idle`, `active`, or `stopping`, active session count, and staged bytes from in-memory counters only.

#### Scenario: Transfer is active
- **WHEN** one or more sessions own staged pages
- **THEN** health and handshake remain responsive and report matching O(1) snapshots without scanning staged files
